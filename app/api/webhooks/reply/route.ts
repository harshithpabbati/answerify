import { GoogleGenAI } from '@google/genai';
import { codeBlock } from 'common-tags';
import { Resend } from 'resend';

import { cleanBody } from '@/lib/cleanBody';
import { createServiceClient } from '@/lib/supabase/service';
import { URL_CONTEXT_FALLBACK_CONFIDENCE } from '@/lib/autopilot';
import { firstPathSegment } from '@/lib/url-section';

function getGenAIClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

/**
 * Derive a 0–1 confidence score from Gemini grounding metadata.
 * Falls back to URL_CONTEXT_FALLBACK_CONFIDENCE when the URL context tool
 * was used but no explicit grounding scores are returned.
 */
function computeConfidence(
   
  candidates: any[] | undefined,
  datasourceCount: number
): number {
  if (!candidates || candidates.length === 0) return URL_CONTEXT_FALLBACK_CONFIDENCE;

  const candidate = candidates[0];
  const supports =
    candidate?.groundingMetadata?.groundingSupports as
      | Array<{ confidenceScores?: number[] }>
      | undefined;

  if (supports && supports.length > 0) {
    // Average all per-chunk confidence scores
    const allScores = supports.flatMap((s) => s.confidenceScores ?? []);
    if (allScores.length > 0) {
      const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      // Clamp to [0, 0.99]: we never claim 100% certainty so agents can always
      // override the autopilot decision when confidence is borderline.
      return Math.min(0.99, Math.max(0, avg));
    }
  }

  // URL context was used (datasources > 0) but no explicit scores returned
  if (datasourceCount > 0) return URL_CONTEXT_FALLBACK_CONFIDENCE;

  return 0;
}

/**
 * Extract cited source URLs from Gemini grounding chunks.
 */
 
function extractCitations(candidates: any[] | undefined): string[] {
  if (!candidates || candidates.length === 0) return [];
  const chunks =
    candidates[0]?.groundingMetadata?.groundingChunks as
      | Array<{ web?: { uri?: string } }>
      | undefined;
  if (!chunks) return [];
  return [...new Set(chunks.map((c) => c.web?.uri).filter(Boolean) as string[])];
}

const CLARIFYING_CONTENT = `<p>Thank you for contacting us. Based on the information available, I wasn't able to provide a complete answer to your question. Could you please provide more details or rephrase your question so we can assist you better?</p>`;

/**
 * Insert a clarifying-question draft reply and return the API response.
 */
async function insertClarifyingDraft(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  organizationId: string,
  threadId: string,
  content: string = CLARIFYING_CONTENT,
): Promise<Response> {
  const { data, error } = await supabase
    .from('reply')
    .insert({
      organization_id: organizationId,
      thread_id: threadId,
      content,
      status: 'draft',
      confidence_score: 0,
      citations: [],
    })
    .select()
    .single();
  return new Response(JSON.stringify({ data, error }), { status: 200 });
}

/**
 * Agent 1 – Research Agent
 *
 * Fetches relevant information from the provided URLs using Gemini's URL
 * context tool and returns a structured summary of facts that are relevant
 * to the customer's question. Keeping research separate from writing lets
 * each agent specialise and produces higher-quality final responses.
 */
async function runResearchAgent(
  ai: GoogleGenAI,
  question: string,
  urlList: string,
): Promise<{ findings: string; candidates: any[] | undefined }> {
  const researchPrompt = codeBlock`
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

  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Customer question:\n${question}\n\nURLs to search:\n${urlList}`,
    config: {
      systemInstruction: researchPrompt,
      maxOutputTokens: 1024,
      temperature: 0.3,
      tools: [{ urlContext: {} }],
    },
  });

  return { findings: result.text ?? '', candidates: result.candidates };
}

/**
 * Agent 2 – Writing Agent
 *
 * Takes the research findings produced by the Research Agent and crafts a
 * polished, customer-facing HTML reply. Because the information has already
 * been gathered and verified, this agent can focus entirely on tone, clarity,
 * and formatting without needing to access any URLs itself.
 */
async function runWritingAgent(
  ai: GoogleGenAI,
  question: string,
  findings: string,
  conversationHistory: string,
): Promise<string> {
  const writingPrompt = codeBlock`
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

  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Customer question:\n${question}\n\nResearch findings:\n${findings}`,
    config: {
      systemInstruction: writingPrompt,
      maxOutputTokens: 1024,
      temperature: 0.7,
    },
  });

  return result.text ?? '';
}

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const { record } = await request.json();

  if (record.role !== 'user') {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const ai = getGenAIClient();
  const supabase = await createServiceClient();

  // Fetch datasources and organization autopilot settings in parallel
  const [{ data: datasources }, { data: org }] = await Promise.all([
    supabase
      .from('datasource')
      .select('id, url')
      .eq('organization_id', record.organization_id),
    supabase
      .from('organization')
      .select('autopilot_enabled, autopilot_threshold')
      .eq('id', record.organization_id)
      .single(),
  ]);

  // Fetch previous emails in this thread for conversation context
  const { data: threadEmails, error: threadEmailsError } = await supabase
    .from('email')
    .select('role, cleaned_body, created_at')
    .eq('thread_id', record.thread_id)
    .neq('id', record.id)
    .order('created_at', { ascending: true })
    .limit(10);

  if (threadEmailsError) {
    console.error('Failed to fetch thread emails:', threadEmailsError);
  }

  if (!datasources || datasources.length === 0) {
    // No knowledge base content found – create a draft asking for more info
    return insertClarifyingDraft(
      supabase,
      record.organization_id,
      record.thread_id,
      `<p>Thank you for reaching out. I wasn't able to find specific information to fully answer your question at this time. Could you please provide more details or clarify your request so we can assist you better?</p>`,
    );
  }

  // Build URL list for Gemini URL context tool.
  // Deduplicate by section prefix so Gemini is never overwhelmed: when many
  // URLs share the same origin + first path segment, use the prefix URL as a
  // representative (e.g. /docs/ instead of 50 individual doc pages).
  const urlList = deduplicateForGemini(datasources.map((d) => d.url)).join('\n');

  // Build conversation history context
  const conversationHistory =
    threadEmails && threadEmails.length > 0
      ? threadEmails
          .map((e) => {
            const label =
              e.role === 'user'
                ? 'Customer'
                : e.role === 'support'
                  ? 'Support'
                  : e.role;
            return `${label}: ${e.cleaned_body}`;
          })
          .join('\n\n')
      : '';

  // --- Agent 1: Research ---
  // Fetch and synthesise relevant information from the datasource URLs.
  // Confidence is derived from the grounding metadata of this step because it
  // is the step that actually reads from the knowledge-base URLs.
  const { findings, candidates: researchCandidates } = await runResearchAgent(
    ai,
    record.cleaned_body,
    urlList,
  );

  const confidence = computeConfidence(researchCandidates, datasources.length);
  const citations = extractCitations(researchCandidates);

  if (!findings || findings.trim() === 'NO_INFORMATION') {
    // Generate clarifying question draft instead of erroring out
    return insertClarifyingDraft(supabase, record.organization_id, record.thread_id);
  }

  // --- Agent 2: Writing ---
  // Take the research findings and produce a polished HTML reply.
  const rawContent = await runWritingAgent(
    ai,
    record.cleaned_body,
    findings,
    conversationHistory,
  );

  if (!rawContent || rawContent.trim() === 'NO_INFORMATION') {
    // Writing agent couldn't produce a response – fall back to clarifying draft
    return insertClarifyingDraft(supabase, record.organization_id, record.thread_id);
  }

  const htmlContent = rawContent.replace(/^```html\s*|\s*```$/g, '');

  // Determine whether autopilot should auto-send this reply
  const autopilotEnabled = org?.autopilot_enabled ?? false;
  const autopilotThreshold = org?.autopilot_threshold ?? 0.65;
  const shouldAutoSend = autopilotEnabled && confidence >= autopilotThreshold;

  if (shouldAutoSend) {
    // Auto-send: fetch thread details to send the email
    const { data: thread } = await supabase
      .from('thread')
      .select('email_from, subject, message_id')
      .eq('id', record.thread_id)
      .single();

    if (thread) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const sentEmail = await resend.emails.send({
        from: 'Support <support@answerify.dev>',
        to: [thread.email_from],
        subject: thread.subject,
        html: htmlContent,
        headers: { 'In-Reply-To': thread.message_id },
      });

      if (sentEmail?.data?.id) {
        // Record the sent staff email
        await supabase.from('email').insert({
          organization_id: record.organization_id,
          thread_id: record.thread_id,
          body: htmlContent,
          cleaned_body: cleanBody(htmlContent),
          role: 'staff',
          email_from: 'support@answerify.dev',
          email_from_name: 'Support',
          is_perfect: true,
        });

        // Save reply as sent
        const { data, error } = await supabase
          .from('reply')
          .insert({
            organization_id: record.organization_id,
            thread_id: record.thread_id,
            content: htmlContent,
            status: 'sent',
            confidence_score: confidence,
            citations,
          })
          .select()
          .single();

        // Trigger learning-loop via approve endpoint so edits are stored
        fetch(`${origin}/api/replies/${data?.id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: htmlContent }),
        }).catch((err) => console.error('Learning-loop approve failed:', err));

        return new Response(JSON.stringify({ data, error }), { status: 200 });
      }
    }
  }

  // Save as draft for human review
  const { data, error } = await supabase
    .from('reply')
    .insert({
      organization_id: record.organization_id,
      thread_id: record.thread_id,
      content: htmlContent,
      status: 'draft',
      confidence_score: confidence,
      citations,
    })
    .select()
    .single();

  return new Response(JSON.stringify({ data, error }), { status: 200 });
}

/**
 * Reduce a potentially large list of datasource URLs to a manageable set for
 * Gemini's URL context tool.
 *
 * Strategy: group by origin + first path segment. When a section has more than
 * one URL, replace all of them with the section prefix URL (e.g. turning 50
 * individual "/docs/…" pages into a single "https://example.com/docs/" entry).
 * This prevents Gemini from being overwhelmed while still pointing it at every
 * distinct content area.
 *
 * A hard cap of MAX_GEMINI_URLS is applied after deduplication.
 */
const MAX_GEMINI_URLS = 20;

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
    // More than one URL in this section → use the prefix as representative
    result.push(groupUrls.length > 1 ? prefix : groupUrls[0]);
    if (result.length >= MAX_GEMINI_URLS) break;
  }
  return result;
}
