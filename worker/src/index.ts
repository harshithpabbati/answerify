/**
 * Answerify – Cloudflare Agents Worker
 *
 * This Worker implements the email reply generation pipeline using the
 * Cloudflare Agents SDK (https://agents.cloudflare.com/).
 *
 * The EmailReplyAgent extends the Agent class from the Cloudflare Agents SDK,
 * which uses Durable Objects for state persistence. This provides several
 * advantages over the Next.js serverless implementation:
 *
 *  - Long-running pipeline steps never time out (Durable Objects can run for hours)
 *  - Agent state is persisted across the research → writing → send pipeline steps
 *  - Each email thread gets its own isolated agent instance (by thread ID)
 *  - Built-in retry and scheduling support via the Agents SDK
 *
 * Architecture:
 *  1. The Next.js app receives inbound emails and calls /api/generate-reply
 *  2. That endpoint forwards the request to this Worker via fetch()
 *  3. routeAgentRequest() dispatches to the correct EmailReplyAgent instance
 *  4. The agent runs the research agent → writing agent pipeline using Gemini
 *  5. Results are written back to Supabase (same DB as the Next.js app)
 *
 * Each thread gets its own Durable Object instance so parallel threads are
 * fully isolated and never block each other.
 */

import { Agent, routeAgentRequest } from 'agents';
import { codeBlock } from 'common-tags';

// ---------------------------------------------------------------------------
// Environment bindings (defined in wrangler.toml / Cloudflare dashboard)
// ---------------------------------------------------------------------------

export interface Env {
  EMAIL_REPLY_AGENT: DurableObjectNamespace;
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  RESEND_API_KEY: string;
  /** Secret shared with the Next.js app to authenticate inbound requests. */
  INBOUND_WEBHOOK_SECRET: string;
  /** Base URL of the Next.js app (e.g. https://answerify.dev). */
  NEXT_APP_URL: string;
}

// ---------------------------------------------------------------------------
// Agent state
// ---------------------------------------------------------------------------

interface AgentState {
  status: 'idle' | 'researching' | 'writing' | 'complete' | 'error';
  organizationId?: string;
  threadId?: string;
  emailId?: string;
  findings?: string;
  confidence?: number;
  citations?: string[];
  reply?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Gemini helpers
// ---------------------------------------------------------------------------

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

async function geminiGenerateContent(
  apiKey: string,
  model: string,
  contents: string,
  systemInstruction: string,
  maxOutputTokens: number,
  temperature: number,
  tools?: object[],
): Promise<{ text: string; candidates: unknown[] }> {
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: contents }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { maxOutputTokens, temperature },
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const response = await fetch(
    `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: {
        groundingSupports?: Array<{ confidenceScores?: number[] }>;
        groundingChunks?: Array<{ web?: { uri?: string } }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return { text, candidates: data.candidates ?? [] };
}

/**
 * Derive a 0–1 confidence score from Gemini grounding metadata.
 */
function computeConfidence(
  candidates: unknown[],
  datasourceCount: number,
): number {
  const URL_CONTEXT_FALLBACK_CONFIDENCE = 0.7;
  if (!candidates || candidates.length === 0) return URL_CONTEXT_FALLBACK_CONFIDENCE;

  const candidate = candidates[0] as {
    groundingMetadata?: {
      groundingSupports?: Array<{ confidenceScores?: number[] }>;
    };
  };
  const supports = candidate?.groundingMetadata?.groundingSupports;

  if (supports && supports.length > 0) {
    const allScores = supports.flatMap((s) => s.confidenceScores ?? []);
    if (allScores.length > 0) {
      const avg = allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length;
      return Math.min(0.99, Math.max(0, avg));
    }
  }

  if (datasourceCount > 0) return URL_CONTEXT_FALLBACK_CONFIDENCE;
  return 0;
}

/**
 * Extract cited source URLs from Gemini grounding chunks.
 */
function extractCitations(candidates: unknown[]): string[] {
  if (!candidates || candidates.length === 0) return [];
  const candidate = candidates[0] as {
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string } }>;
    };
  };
  const chunks = candidate?.groundingMetadata?.groundingChunks;
  if (!chunks) return [];
  return [
    ...new Set(
      chunks.map((c) => c.web?.uri).filter((u): u is string => Boolean(u)),
    ),
  ];
}

// ---------------------------------------------------------------------------
// Supabase helpers (thin REST wrapper – no SDK dependency needed in Workers)
// ---------------------------------------------------------------------------

async function supabaseFetch(
  supabaseUrl: string,
  serviceKey: string,
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase ${options.method ?? 'GET'} ${path} failed (${response.status}): ${body}`);
  }

  return response.json();
}

const CLARIFYING_CONTENT =
  '<p>Thank you for contacting us. Based on the information available, I wasn\'t able to provide a complete answer to your question. Could you please provide more details or rephrase your question so we can assist you better?</p>';

// ---------------------------------------------------------------------------
// EmailReplyAgent – one Durable Object instance per email thread
// ---------------------------------------------------------------------------

export class EmailReplyAgent extends Agent<Env, AgentState> {
  initialState: AgentState = { status: 'idle' };

  /**
   * Main entry point called by routeAgentRequest().
   *
   * Expects a JSON body of the shape sent by the Next.js /api/generate-reply
   * route (same schema as the existing /api/webhooks/reply route):
   * {
   *   record:              email row from Supabase
   *   datasources:         [{ id, url }]
   *   org:                 { autopilot_enabled, autopilot_threshold }
   *   thread:              { email_from, subject, message_id }
   *   conversationHistory: string
   * }
   */
  async onRequest(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Authenticate the request from the Next.js app
    const secret = request.headers.get('X-Agent-Secret');
    if (secret !== this.env.INBOUND_WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { record, datasources, org, thread, conversationHistory } =
      (await request.json()) as {
        record: {
          id: string;
          organization_id: string;
          thread_id: string;
          cleaned_body: string;
          role: string;
        };
        datasources: Array<{ id: string; url: string }>;
        org: { autopilot_enabled: boolean; autopilot_threshold: number };
        thread: { email_from: string; subject: string; message_id: string };
        conversationHistory: string;
      };

    // Guard: only process user messages
    if (record.role !== 'user') {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    await this.setState({ ...this.state, status: 'researching', threadId: record.thread_id, organizationId: record.organization_id, emailId: record.id });

    const supabaseUrl = this.env.SUPABASE_URL;
    const serviceKey = this.env.SUPABASE_SERVICE_KEY;

    if (!datasources || datasources.length === 0) {
      await this.insertClarifyingDraft(
        supabaseUrl,
        serviceKey,
        record.organization_id,
        record.thread_id,
        '<p>Thank you for reaching out. I wasn\'t able to find specific information to fully answer your question at this time. Could you please provide more details or clarify your request so we can assist you better?</p>',
      );
      await this.setState({ ...this.state, status: 'complete' });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const urlList = deduplicateForGemini(datasources.map((d) => d.url)).join('\n');

    // ------------------------------------------------------------------
    // Step 1 – Research Agent
    // ------------------------------------------------------------------
    let findings: string;
    let researchCandidates: unknown[];
    try {
      const result = await this.runResearchAgent(
        thread?.subject ?? '',
        record.cleaned_body,
        urlList,
      );
      findings = result.findings;
      researchCandidates = result.candidates;
    } catch (err) {
      await this.setState({ ...this.state, status: 'error', error: String(err) });
      return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
    }

    const confidence = computeConfidence(researchCandidates, datasources.length);
    const citations = extractCitations(researchCandidates);

    if (!findings || findings.trim() === 'NO_INFORMATION') {
      await this.insertClarifyingDraft(supabaseUrl, serviceKey, record.organization_id, record.thread_id);
      await this.setState({ ...this.state, status: 'complete' });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Persist research findings in agent state (survives any transient errors)
    await this.setState({ ...this.state, status: 'writing', findings, confidence, citations });

    // ------------------------------------------------------------------
    // Step 2 – Writing Agent
    // ------------------------------------------------------------------
    let rawContent: string;
    try {
      rawContent = await this.runWritingAgent(
        thread?.subject ?? '',
        record.cleaned_body,
        findings,
        conversationHistory ?? '',
      );
    } catch (err) {
      await this.setState({ ...this.state, status: 'error', error: String(err) });
      return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
    }

    if (!rawContent || rawContent.trim() === 'NO_INFORMATION') {
      await this.insertClarifyingDraft(supabaseUrl, serviceKey, record.organization_id, record.thread_id);
      await this.setState({ ...this.state, status: 'complete' });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const htmlContent = rawContent.replace(/^```html\s*|\s*```$/g, '');

    await this.setState({ ...this.state, reply: htmlContent });

    // ------------------------------------------------------------------
    // Step 3 – Auto-send or save as draft
    // ------------------------------------------------------------------
    const autopilotEnabled = org?.autopilot_enabled ?? false;
    const autopilotThreshold = org?.autopilot_threshold ?? 0.65;
    const shouldAutoSend = autopilotEnabled && confidence >= autopilotThreshold;

    if (shouldAutoSend && thread) {
      const sent = await this.sendEmail(thread, htmlContent);
      if (sent) {
        // Record the sent staff email in Supabase
        await supabaseFetch(supabaseUrl, serviceKey, 'email', {
          method: 'POST',
          body: JSON.stringify({
            organization_id: record.organization_id,
            thread_id: record.thread_id,
            body: htmlContent,
            cleaned_body: htmlContent.replace(/<[^>]*>/g, '').replace(/</g, ''),
            role: 'staff',
            email_from: 'support@answerify.dev',
            email_from_name: 'Support',
            is_perfect: true,
          }),
        });

        await supabaseFetch(supabaseUrl, serviceKey, 'reply', {
          method: 'POST',
          body: JSON.stringify({
            organization_id: record.organization_id,
            thread_id: record.thread_id,
            content: htmlContent,
            status: 'sent',
            confidence_score: confidence,
            citations,
          }),
        });

        await this.setState({ ...this.state, status: 'complete' });
        return new Response(JSON.stringify({ ok: true, status: 'sent' }), { status: 200 });
      }
    }

    // Save as draft for human review
    const draft = await supabaseFetch(supabaseUrl, serviceKey, 'reply', {
      method: 'POST',
      body: JSON.stringify({
        organization_id: record.organization_id,
        thread_id: record.thread_id,
        content: htmlContent,
        status: 'draft',
        confidence_score: confidence,
        citations,
      }),
    });

    await this.setState({ ...this.state, status: 'complete' });
    return new Response(JSON.stringify({ data: draft }), { status: 200 });
  }

  // ------------------------------------------------------------------
  // Research Agent
  // ------------------------------------------------------------------
  private async runResearchAgent(
    subject: string,
    question: string,
    urlList: string,
  ): Promise<{ findings: string; candidates: unknown[] }> {
    const systemInstruction = codeBlock`
      You are a research assistant for a customer support team.
      Your job is to find and extract the most relevant information from the provided URLs
      to answer a customer's question.

      - Read the content available at the provided URLs
      - Extract only information that is directly relevant to the question
      - Organise the findings as concise bullet points or short paragraphs
      - Include specific details: steps, values, settings, or policies that apply
      - Do not write the final reply – only gather and present the raw facts
      - If no relevant information can be found, respond with only: NO_INFORMATION
    `;

    const { text, candidates } = await geminiGenerateContent(
      this.env.GEMINI_API_KEY,
      'gemini-2.5-flash',
      `Subject: ${subject}\nCustomer question:\n${question}\n\nURLs to search:\n${urlList}`,
      systemInstruction,
      1024,
      0.3,
      [{ urlContext: {} }],
    );

    return { findings: text, candidates };
  }

  // ------------------------------------------------------------------
  // Writing Agent
  // ------------------------------------------------------------------
  private async runWritingAgent(
    subject: string,
    question: string,
    findings: string,
    conversationHistory: string,
  ): Promise<string> {
    const systemInstruction = codeBlock`
      You are a friendly and helpful customer support agent. You write like a real person,
      not a documentation bot. Keep your tone warm, conversational, and to the point.

      When answering:
      - Address the customer directly
      - Don't use section headers or bold titles unless truly necessary
      - Avoid bullet points for simple answers; use them only when listing steps or options
      - Don't narrate what you're about to do (e.g. avoid "Here's a breakdown of..." or "Now I will answer...")
      - Do not include any internal reasoning, planning, or thinking in your response
      - Get straight to the answer
      - Keep it concise but complete
      - Do not include citation markers like [cite: 1] or [1] inline in the text

      You must base your reply solely on the research findings provided below.
      Do not invent information that is not present in the findings.

      If the findings do not contain enough information to answer the question,
      respond with only the text: NO_INFORMATION
      Do not explain why. Do not apologize. Do not add anything else.

      ${conversationHistory ? `Previous conversation:\n${conversationHistory}\n` : ''}
      Reply back in HTML and nothing else, avoid using markdown.
      Format the response as follows:
      - Use <p> tags for each distinct topic or thought
      - When answering multiple questions, use a <p><strong>Topic</strong></p> followed by a <p> for the answer
      - Use <ul> and <li> only for genuine lists (3+ items or step-by-step options)
      - Add a short friendly opening line in its own <p>
      - Keep paragraphs short (2-4 sentences max)
      - Do not use <h1>, <h2>, <h3> tags
      - Avoid signature at the end of the reply
      - Do not output anything outside of the HTML response
    `;

    const { text } = await geminiGenerateContent(
      this.env.GEMINI_API_KEY,
      'gemini-2.5-flash',
      `Subject: ${subject}\nCustomer question:\n${question}\n\nResearch findings:\n${findings}`,
      systemInstruction,
      1024,
      0.7,
    );

    return text;
  }

  // ------------------------------------------------------------------
  // Send email via Resend
  // ------------------------------------------------------------------
  private async sendEmail(
    thread: { email_from: string; subject: string; message_id: string },
    htmlContent: string,
  ): Promise<boolean> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Support <support@answerify.dev>',
        to: [thread.email_from],
        subject: thread.subject,
        html: htmlContent,
        headers: { 'In-Reply-To': thread.message_id },
      }),
    });

    if (!response.ok) {
      console.error('Resend error:', await response.text());
      return false;
    }

    const data = (await response.json()) as { id?: string };
    return Boolean(data?.id);
  }

  // ------------------------------------------------------------------
  // Insert a clarifying-question draft reply
  // ------------------------------------------------------------------
  private async insertClarifyingDraft(
    supabaseUrl: string,
    serviceKey: string,
    organizationId: string,
    threadId: string,
    content: string = CLARIFYING_CONTENT,
  ): Promise<void> {
    await supabaseFetch(supabaseUrl, serviceKey, 'reply', {
      method: 'POST',
      body: JSON.stringify({
        organization_id: organizationId,
        thread_id: threadId,
        content,
        status: 'draft',
        confidence_score: 0,
        citations: [],
      }),
    });
  }
}

// ---------------------------------------------------------------------------
// URL deduplication (same logic as in the Next.js app)
// ---------------------------------------------------------------------------

const MAX_GEMINI_URLS = 20;

function firstPathSegment(url: string): string {
  try {
    const { pathname } = new URL(url);
    return pathname.split('/').filter(Boolean)[0] ?? '';
  } catch {
    return '';
  }
}

function deduplicateForGemini(urls: string[]): string[] {
  if (urls.length <= MAX_GEMINI_URLS) return urls;

  const groups = new Map<string, string[]>();
  for (const url of urls) {
    let key: string;
    try {
      const parsed = new URL(url);
      const seg = firstPathSegment(url);
      key = seg ? `${parsed.origin}/${seg}/` : `${parsed.origin}/`;
    } catch {
      key = url;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(url);
  }

  const result: string[] = [];
  for (const [prefix, groupUrls] of groups) {
    result.push(groupUrls.length > 1 ? prefix : groupUrls[0]);
    if (result.length >= MAX_GEMINI_URLS) break;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Authenticate all incoming requests
    const secret = request.headers.get('X-Agent-Secret');
    if (secret !== env.INBOUND_WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Route request to the correct EmailReplyAgent instance.
    // Each thread gets its own Durable Object (agent) instance, keyed by thread ID.
    return (
      (await routeAgentRequest(request, env)) ??
      new Response('Not Found', { status: 404 })
    );
  },
};
