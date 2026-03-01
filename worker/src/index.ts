/**
 * Answerify – Cloudflare Agents Worker
 *
 * This Worker integrates with Cloudflare Email Routing and the Cloudflare
 * Agents SDK (https://agents.cloudflare.com/) to process inbound support
 * emails end-to-end, replacing the Next.js /api/webhooks/inbound-email and
 * /api/webhooks/reply routes.
 *
 * Flow:
 *  1. Cloudflare Email Routing delivers raw emails to the `email` export.
 *  2. A thread-aware resolver maps each message to the correct EmailReplyAgent
 *     Durable Object instance (one per thread, keyed by the Supabase thread ID).
 *  3. EmailReplyAgent.onEmail() handles:
 *       a. Auto-reply detection (RFC 3834 / X-Auto-Response-Suppress headers)
 *       b. Raw email parsing via PostalMime
 *       c. Organization lookup by recipient address
 *       d. Thread creation/lookup in Supabase
 *       e. Email record insertion
 *       f. Research Agent – fetches relevant info from datasource URLs
 *       g. Writing Agent  – produces a polished HTML reply
 *       h. Auto-send via this.replyToEmail() (or save as draft for human review)
 *
 * Sending replies uses Cloudflare's native email.reply() via this.replyToEmail().
 * This ensures the reply lands in the customer's existing email thread automatically
 * (In-Reply-To / References headers are set correctly) without any external
 * email-sending service.
 *
 * Each email thread gets its own isolated Durable Object instance so parallel
 * threads never block each other and pipeline state survives transient errors.
 *
 * An optional HTTP path (onRequest) lets the Next.js dashboard manually
 * trigger AI reply generation for a specific email ID; it always saves a draft
 * for human review rather than auto-sending.
 */

import { Agent, routeAgentEmail, routeAgentRequest } from 'agents';
import { isAutoReplyEmail } from 'agents/email';
import { codeBlock } from 'common-tags';
import PostalMime from 'postal-mime';

import type { AgentEmail } from 'agents/email';

// ---------------------------------------------------------------------------
// Environment bindings (wrangler.toml / Cloudflare dashboard secrets)
// ---------------------------------------------------------------------------

export interface Env {
  EMAIL_REPLY_AGENT: DurableObjectNamespace;
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  /**
   * Shared secret used to authenticate HTTP requests from the Next.js app to
   * the Worker's onRequest handler.
   */
  INBOUND_WEBHOOK_SECRET: string;
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
// Supabase REST helpers (no SDK dependency required in Workers)
// ---------------------------------------------------------------------------

async function supabaseFetch<T = unknown>(
  supabaseUrl: string,
  serviceKey: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
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
    throw new Error(
      `Supabase ${options.method ?? 'GET'} /${path} failed (${response.status}): ${body}`,
    );
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Gemini helpers (direct REST – no Node.js SDK needed in Workers)
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
// URL deduplication (mirrors the logic in the Next.js webhooks/reply route)
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
// Clarifying-question draft content
// ---------------------------------------------------------------------------

const CLARIFYING_CONTENT =
  "<p>Thank you for contacting us. Based on the information available, I wasn't able to provide a complete answer to your question. Could you please provide more details or rephrase your question so we can assist you better?</p>";

// ---------------------------------------------------------------------------
// EmailReplyAgent – one Durable Object instance per email thread
// ---------------------------------------------------------------------------

export class EmailReplyAgent extends Agent<Env, AgentState> {
  initialState: AgentState = { status: 'idle' };

  // -------------------------------------------------------------------------
  // onEmail – called by routeAgentEmail() for emails from Cloudflare Email
  // Routing. This completely replaces the Next.js inbound-email webhook.
  // -------------------------------------------------------------------------
  async onEmail(email: AgentEmail): Promise<void> {
    // Ignore auto-generated messages (out-of-office, delivery receipts, etc.)
    const headersList = [...email.headers.entries()].map(([key, value]) => ({ key, value }));
    if (isAutoReplyEmail(headersList)) {
      email.setReject('Auto-replies are not accepted');
      return;
    }

    const supabaseUrl = this.env.SUPABASE_URL;
    const serviceKey = this.env.SUPABASE_SERVICE_KEY;

    // Parse the raw email bytes
    const rawBytes = await email.getRaw();
    const parsed = await new PostalMime().parse(rawBytes);

    const fromAddress = parsed.from?.address ?? email.from;
    const fromName = parsed.from?.name ?? '';
    const subject = parsed.subject ?? '(No subject)';
    const html = parsed.html ?? null;
    const text = parsed.text ?? null;
    const messageId = parsed.messageId ?? null;
    const references = parsed.references ?? null;

    // Look up the organization that owns this inbound address
    const orgRows = await supabaseFetch<Array<{ id: string }>>(
      supabaseUrl,
      serviceKey,
      `organization?inbound_email=eq.${encodeURIComponent(email.to)}&select=id&limit=1`,
    );

    if (!orgRows || orgRows.length === 0) {
      console.error('No organization found for recipient:', email.to);
      return;
    }

    const organizationId = orgRows[0].id;

    // Find or create the thread.
    // For new emails (no references) the agent ID (this.name) was pre-assigned
    // by the resolver as a new UUID and we use it as the Supabase thread ID.
    let threadId: string;
    let threadStatus: string | null = null;

    if (references) {
      // Reply to an existing thread – resolver already looked up the thread
      // and set this.name to its ID, so we can use it directly.
      threadId = this.name;
      const threadRows = await supabaseFetch<Array<{ id: string; status: string }>>(
        supabaseUrl,
        serviceKey,
        `thread?id=eq.${encodeURIComponent(threadId)}&select=id,status&limit=1`,
      );
      if (threadRows && threadRows.length > 0) {
        threadStatus = threadRows[0].status;
      }
    } else {
      // New thread – create it in Supabase using this.name as the ID
      const created = await supabaseFetch<Array<{ id: string; status: string }>>(
        supabaseUrl,
        serviceKey,
        'thread',
        {
          method: 'POST',
          body: JSON.stringify({
            id: this.name,
            organization_id: organizationId,
            email_from: fromAddress,
            email_from_name: fromName,
            subject,
            message_id: messageId,
          }),
        },
      );
      if (!created || created.length === 0) {
        console.error('Failed to create thread');
        return;
      }
      threadId = created[0].id;
      threadStatus = created[0].status;
    }

    await this.setState({
      ...this.state,
      status: 'researching',
      organizationId,
      threadId,
    });

    // Re-open closed threads when a customer writes again
    if (threadStatus === 'closed') {
      await supabaseFetch(supabaseUrl, serviceKey, `thread?id=eq.${encodeURIComponent(threadId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'open' }),
      });
    }

    // Store the inbound email record
    const emailRows = await supabaseFetch<Array<{ id: string }>>(
      supabaseUrl,
      serviceKey,
      'email',
      {
        method: 'POST',
        body: JSON.stringify({
          organization_id: organizationId,
          thread_id: threadId,
          email_from: fromAddress,
          email_from_name: fromName,
          body: html,
          cleaned_body: text,
          role: 'user',
        }),
      },
    );

    const emailId = emailRows?.[0]?.id;
    await this.setState({ ...this.state, emailId });

    // Run the AI reply pipeline
    await this.generateReply({
      email,
      organizationId,
      threadId,
      emailId: emailId ?? '',
      cleanedBody: text ?? '',
      subject,
    });
  }

  // -------------------------------------------------------------------------
  // onRequest – HTTP handler for the Next.js fallback path.
  // Accepts { emailId } and fetches all context from Supabase itself so the
  // caller doesn't need to pass a large payload.
  // -------------------------------------------------------------------------
  async onRequest(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const secret = request.headers.get('X-Agent-Secret');
    if (secret !== this.env.INBOUND_WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { emailId } = (await request.json()) as { emailId: string };
    if (!emailId) {
      return new Response('Missing emailId', { status: 400 });
    }

    const supabaseUrl = this.env.SUPABASE_URL;
    const serviceKey = this.env.SUPABASE_SERVICE_KEY;

    // Fetch the email record
    const emailRows = await supabaseFetch<
      Array<{
        id: string;
        organization_id: string;
        thread_id: string;
        cleaned_body: string;
        role: string;
      }>
    >(supabaseUrl, serviceKey, `email?id=eq.${encodeURIComponent(emailId)}&limit=1`);

    if (!emailRows || emailRows.length === 0) {
      return new Response('Email not found', { status: 404 });
    }

    const record = emailRows[0];
    if (record.role !== 'user') {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Fetch thread info
    const threadRows = await supabaseFetch<
      Array<{ email_from: string; subject: string; message_id: string }>
    >(
      supabaseUrl,
      serviceKey,
      `thread?id=eq.${encodeURIComponent(record.thread_id)}&select=email_from,subject,message_id&limit=1`,
    );
    const thread = threadRows?.[0];

    await this.setState({
      ...this.state,
      status: 'researching',
      organizationId: record.organization_id,
      threadId: record.thread_id,
      emailId: record.id,
    });

    await this.generateReply({
      organizationId: record.organization_id,
      threadId: record.thread_id,
      emailId: record.id,
      cleanedBody: record.cleaned_body,
      subject: thread?.subject ?? '',
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // -------------------------------------------------------------------------
  // generateReply – shared AI pipeline (used by both onEmail and onRequest)
  //
  // When `email` is provided (i.e. called from onEmail), auto-send uses
  // this.replyToEmail() so Cloudflare sets In-Reply-To correctly and the
  // reply lands in the customer's existing thread natively.
  //
  // When called from onRequest (dashboard HTTP trigger), `email` is absent
  // and the result is always saved as a draft for human review.
  // -------------------------------------------------------------------------
  private async generateReply(params: {
    email?: AgentEmail;
    organizationId: string;
    threadId: string;
    emailId: string;
    cleanedBody: string;
    subject: string;
  }): Promise<void> {
    const { email, organizationId, threadId, emailId, cleanedBody, subject } = params;
    const supabaseUrl = this.env.SUPABASE_URL;
    const serviceKey = this.env.SUPABASE_SERVICE_KEY;

    // Fetch datasources, org autopilot settings, and conversation history in parallel
    const [datasourceRows, orgRows, historyRows] = await Promise.all([
      supabaseFetch<Array<{ id: string; url: string }>>(
        supabaseUrl,
        serviceKey,
        `datasource?organization_id=eq.${encodeURIComponent(organizationId)}&select=id,url`,
      ),
      supabaseFetch<Array<{ autopilot_enabled: boolean; autopilot_threshold: number }>>(
        supabaseUrl,
        serviceKey,
        `organization?id=eq.${encodeURIComponent(organizationId)}&select=autopilot_enabled,autopilot_threshold&limit=1`,
      ),
      supabaseFetch<Array<{ role: string; cleaned_body: string }>>(
        supabaseUrl,
        serviceKey,
        `email?thread_id=eq.${encodeURIComponent(threadId)}&id=neq.${encodeURIComponent(emailId)}&select=role,cleaned_body&order=created_at.asc&limit=10`,
      ),
    ]);

    if (!datasourceRows || datasourceRows.length === 0) {
      await this.insertClarifyingDraft(
        supabaseUrl,
        serviceKey,
        organizationId,
        threadId,
      );
      await this.setState({ ...this.state, status: 'complete' });
      return;
    }

    const urlList = deduplicateForGemini(datasourceRows.map((d) => d.url)).join('\n');

    const conversationHistory =
      historyRows && historyRows.length > 0
        ? historyRows
            .map((e) => {
              const label =
                e.role === 'user' ? 'Customer' : e.role === 'support' ? 'Support' : e.role;
              return `${label}: ${e.cleaned_body}`;
            })
            .join('\n\n')
        : '';

    // --- Step 1: Research Agent ---
    let findings: string;
    let researchCandidates: unknown[];
    try {
      const result = await this.runResearchAgent(subject, cleanedBody, urlList);
      findings = result.findings;
      researchCandidates = result.candidates;
    } catch (err) {
      await this.setState({ ...this.state, status: 'error', error: String(err) });
      return;
    }

    const confidence = computeConfidence(researchCandidates, datasourceRows.length);
    const citations = extractCitations(researchCandidates);

    if (!findings || findings.trim() === 'NO_INFORMATION') {
      await this.insertClarifyingDraft(supabaseUrl, serviceKey, organizationId, threadId);
      await this.setState({ ...this.state, status: 'complete' });
      return;
    }

    await this.setState({ ...this.state, status: 'writing', findings, confidence, citations });

    // --- Step 2: Writing Agent ---
    let rawContent: string;
    try {
      rawContent = await this.runWritingAgent(subject, cleanedBody, findings, conversationHistory);
    } catch (err) {
      await this.setState({ ...this.state, status: 'error', error: String(err) });
      return;
    }

    if (!rawContent || rawContent.trim() === 'NO_INFORMATION') {
      await this.insertClarifyingDraft(supabaseUrl, serviceKey, organizationId, threadId);
      await this.setState({ ...this.state, status: 'complete' });
      return;
    }

    const htmlContent = rawContent.replace(/^```html\s*|\s*```$/g, '');
    await this.setState({ ...this.state, reply: htmlContent });

    const org = orgRows?.[0];
    const autopilotEnabled = org?.autopilot_enabled ?? false;
    const autopilotThreshold = org?.autopilot_threshold ?? 0.65;
    // Auto-send is only available from the email path (email object present).
    // The onRequest/dashboard path always creates a draft for human review.
    const shouldAutoSend = email !== undefined && autopilotEnabled && confidence >= autopilotThreshold;

    // --- Step 3: Send or draft ---
    if (shouldAutoSend && email) {
      try {
        // Use Cloudflare's native reply – sets In-Reply-To automatically so
        // the reply lands in the customer's existing email thread.
        await this.replyToEmail(email, {
          fromName: 'Support',
          body: htmlContent,
          contentType: 'text/html',
          secret: null,
        });

        await supabaseFetch(supabaseUrl, serviceKey, 'email', {
          method: 'POST',
          body: JSON.stringify({
            organization_id: organizationId,
            thread_id: threadId,
            body: htmlContent,
            // Single-pass strip: matches from '<' to the next '>' OR end-of-string,
            // so both complete tags and unclosed/partial tags (e.g. '<script') are removed.
            cleaned_body: htmlContent.replace(/<[^>]*(>|$)/gm, ''),
            role: 'staff',
            email_from: email.to,
            email_from_name: 'Support',
            is_perfect: true,
          }),
        });

        await supabaseFetch(supabaseUrl, serviceKey, 'reply', {
          method: 'POST',
          body: JSON.stringify({
            organization_id: organizationId,
            thread_id: threadId,
            content: htmlContent,
            status: 'sent',
            confidence_score: confidence,
            citations,
          }),
        });

        await this.setState({ ...this.state, status: 'complete' });
        return;
      } catch (err) {
        console.error(`replyToEmail failed for thread ${threadId}, email ${emailId}:`, err);
        // Fall through to save as draft
      }
    }

    // Save as draft for human review
    await supabaseFetch(supabaseUrl, serviceKey, 'reply', {
      method: 'POST',
      body: JSON.stringify({
        organization_id: organizationId,
        thread_id: threadId,
        content: htmlContent,
        status: 'draft',
        confidence_score: confidence,
        citations,
      }),
    });

    await this.setState({ ...this.state, status: 'complete' });
  }

  // -------------------------------------------------------------------------
  // Research Agent
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Writing Agent
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Insert a clarifying-question draft reply
  // -------------------------------------------------------------------------
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
// Thread-aware email resolver
//
// Routing strategy (tried in order):
//  1. In-Reply-To header – look up the thread in Supabase by the original
//     message-id. Handles customer replies in any email client.
//  2. New email – generate a fresh UUID; the agent will create the thread.
//
// Note: sub-address routing is no longer needed because outbound replies use
// this.replyToEmail() which sets In-Reply-To natively via Cloudflare, so
// customer replies always carry the correct In-Reply-To header.
// ---------------------------------------------------------------------------

async function resolveEmailToAgent(
  email: ForwardableEmailMessage,
  env: Env,
): Promise<{ agentName: string; agentId: string } | null> {
  const AGENT_NAME = 'email-reply-agent';

  // 1. In-Reply-To header → look up thread by message_id in Supabase
  const inReplyTo = email.headers.get('in-reply-to');
  if (inReplyTo) {
    try {
      const rows = await supabaseFetch<Array<{ id: string }>>(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_KEY,
        `thread?message_id=eq.${encodeURIComponent(inReplyTo)}&select=id&limit=1`,
      );
      if (rows && rows.length > 0) {
        return { agentName: AGENT_NAME, agentId: rows[0].id };
      }
    } catch (err) {
      console.error('Thread lookup failed:', err);
    }
  }

  // 2. New email – generate a fresh UUID for a new thread
  return { agentName: AGENT_NAME, agentId: crypto.randomUUID() };
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

export default {
  /**
   * email – Cloudflare Email Routing entry point.
   * Receives raw EmailMessage objects directly from Cloudflare Email Routing
   * and dispatches them to the correct EmailReplyAgent Durable Object.
   * This replaces the Next.js /api/webhooks/inbound-email route entirely.
   */
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    await routeAgentEmail(message, env, {
      resolver: (msg, e) => resolveEmailToAgent(msg, e),
      onNoRoute: (msg) => {
        console.error('No route found for email:', msg.from, '→', msg.to);
        msg.setReject('Unable to route email to a support thread');
      },
    });
  },

  /**
   * fetch – HTTP entry point for calls from the Next.js app.
   * Supports the manual "Generate Reply" action in the dashboard when the
   * operator wants to regenerate an AI draft for a specific email.
   * Routes to routeAgentRequest() which forwards to EmailReplyAgent.onRequest().
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routeAgentRequest(request, env)) ??
      new Response('Not Found', { status: 404 })
    );
  },
};

