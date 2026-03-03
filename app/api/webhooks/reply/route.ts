import { generateText } from 'ai';
import { codeBlock } from 'common-tags';
import { Resend } from 'resend';

import { textModel } from '@/lib/ai';
import { URL_CONTEXT_FALLBACK_CONFIDENCE } from '@/lib/autopilot';
import { cleanBody } from '@/lib/cleanBody';
import { generateEmbedding, serializeEmbedding } from '@/lib/embeddings';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Derive a 0–1 confidence score from vector similarity results.
 */
function computeVectorConfidence(similarities: number[]): number {
  if (similarities.length === 0) return 0;
  const avg = similarities.reduce((a, b) => a + b, 0) / similarities.length;
  return Math.min(0.99, Math.max(0, avg));
}

const CLARIFYING_CONTENT = `<p>Thank you for contacting us. Based on the information available, I wasn't able to provide a complete answer to your question. Could you please provide more details or rephrase your question so we can assist you better?</p>`;

/**
 * Insert a clarifying-question draft reply and return the API response.
 */
async function insertClarifyingDraft(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  organizationId: string,
  threadId: string,
  content: string = CLARIFYING_CONTENT
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
 * Agentic RAG – Retrieval step
 *
 * Embeds the customer question and searches the `section` table for
 * pre-indexed content chunks that are semantically similar.  Returns the
 * matched sections sorted by relevance.
 */
async function retrieveSections(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  organizationId: string,
  question: string
): Promise<
  Array<{ content: string; datasource_id: string; similarity: number }>
> {
  const questionEmbedding = await generateEmbedding(question);
  if (questionEmbedding.length === 0) return [];

  const { data, error } = await supabase.rpc('match_sections', {
    embedding: serializeEmbedding(questionEmbedding),
    match_threshold: 0.1,
    p_organization_id: organizationId,
    match_count: 10,
  });

  if (error) {
    console.error('Vector search failed:', error);
    return [];
  }

  return (data ?? []) as Array<{
    content: string;
    datasource_id: string;
    similarity: number;
  }>;
}

/**
 * Agent 1a – Research Agent (vector context)
 *
 * Uses pre-embedded section content retrieved via vector search as context.
 * No URL fetching is required, dramatically reducing token usage.
 */
async function runResearchAgentWithSections(
  subject: string,
  question: string,
  sectionContent: string
): Promise<string> {
  const researchPrompt = codeBlock`
    You are a research assistant for a customer support team.
    Your job is to find and extract the most relevant information from the
    provided knowledge base content to answer a customer's question.

    - Extract only information that is directly relevant to the question
    - Organise the findings as concise bullet points or short paragraphs
    - Include specific details: steps, values, settings, or policies that apply
    - Do not write the final reply – only gather and present the raw facts
    - If no relevant information can be found, respond with only: NO_INFORMATION
  `;

  const { text } = await generateText({
    model: textModel,
    system: researchPrompt,
    prompt: `Subject: ${subject}\nCustomer question:\n${question}\n\nKnowledge base content:\n${sectionContent}`,
    maxOutputTokens: 1024,
    temperature: 0.3,
  });

  return text;
}

/**
 * Agent 1b – Research Agent (datasource content fallback)
 *
 * Falls back to using stored datasource content when vector search does not
 * yield enough high-quality matches. This is model-agnostic — the content
 * was already fetched and stored when the datasource was indexed.
 */
async function runResearchAgentWithContent(
  subject: string,
  question: string,
  datasourceContent: string
): Promise<string> {
  const researchPrompt = codeBlock`
    You are a research assistant for a customer support team.
    Your job is to find and extract the most relevant information from the provided
    knowledge base content to answer a customer's question.

    - Read the content provided below
    - Extract only information that is directly relevant to the question
    - Organise the findings as concise bullet points or short paragraphs
    - Include specific details: steps, values, settings, or policies that apply
    - Do not write the final reply – only gather and present the raw facts
    - If no relevant information can be found, respond with only: NO_INFORMATION
  `;

  const { text } = await generateText({
    model: textModel,
    system: researchPrompt,
    prompt: `Subject: ${subject}\nCustomer question:\n${question}\n\nKnowledge base content:\n${datasourceContent}`,
    maxOutputTokens: 1024,
    temperature: 0.3,
  });

  return text;
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
  subject: string,
  question: string,
  findings: string,
  conversationHistory: string,
  tonePolicy?: string | null
): Promise<string> {
  const tonePolicySection = tonePolicy?.trim()
    ? `\n\n    Org tone and policy rules (follow strictly):\n    ${tonePolicy.trim()}`
    : '';

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
    ${tonePolicySection}
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

  const { text } = await generateText({
    model: textModel,
    system: writingPrompt,
    prompt: `Subject: ${subject}\nCustomer question:\n${question}\n\nResearch findings:\n${findings}`,
    maxOutputTokens: 1024,
    temperature: 0.7,
  });

  return text;
}

/**
 * Agent 0 – API Routing Agent
 *
 * Determines whether any connected API should be called to answer the customer
 * question.  If a call is warranted it returns a structured decision; otherwise
 * it returns null so the pipeline falls through to vector-search alone.
 */
async function runApiRoutingAgent(
  subject: string,
  question: string,
  apiConnections: Array<{ id: string; name: string; base_url: string; description: string | null }>
): Promise<{ api_id: string; endpoint: string; query_params?: Record<string, string> } | null> {
  if (apiConnections.length === 0) return null;

  const apiList = apiConnections
    .map(
      (c) =>
        `- id: ${c.id}\n  name: ${c.name}\n  base_url: ${c.base_url}\n  description: ${c.description ?? 'No description'}`
    )
    .join('\n');

  const { text } = await generateText({
    model: textModel,
    system: codeBlock`
      You are an API routing assistant for a customer support system.
      Your job is to decide whether any of the connected APIs should be called
      to answer a customer's question with live data.

      Rules:
      - Only suggest an API call when the question clearly requires live, personalized
        data (e.g. "What is my latest invoice?", "How much have I used this month?").
      - Do NOT suggest an API call for general knowledge questions.
      - If an API call is needed, output ONLY valid JSON (no markdown) in this exact shape:
        { "api_id": "<id from the list>", "endpoint": "<path relative to base_url>", "query_params": {} }
      - If no API call is needed, output ONLY the word: NONE
    `,
    prompt: `Subject: ${subject}\nCustomer question:\n${question}\n\nConnected APIs:\n${apiList}`,
    maxOutputTokens: 256,
    temperature: 0,
  });

  const trimmed = text.trim();
  if (trimmed === 'NONE' || trimmed === '') return null;

  try {
    return JSON.parse(trimmed) as {
      api_id: string;
      endpoint: string;
      query_params?: Record<string, string>;
    };
  } catch {
    return null;
  }
}

/** Maximum number of characters to keep from an external API response. */
const MAX_API_RESPONSE_LENGTH = 4000;

/**
 * Executes an API call against a connected external API.
 * Returns the response body as a string, or null on failure.
 */
async function callExternalApi(
  connection: { base_url: string; api_key: string },
  endpoint: string,
  queryParams: Record<string, string>
): Promise<string | null> {
  try {
    const url = new URL(
      endpoint.startsWith('/') ? endpoint : `/${endpoint}`,
      connection.base_url.endsWith('/')
        ? connection.base_url
        : `${connection.base_url}/`
    );
    for (const [k, v] of Object.entries(queryParams)) {
      url.searchParams.set(k, v);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${connection.api_key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return null;
    const body = await response.text();
    // Truncate large responses to avoid overwhelming the AI context
    return body.length > MAX_API_RESPONSE_LENGTH
      ? `${body.slice(0, MAX_API_RESPONSE_LENGTH)}…`
      : body;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const { record } = await request.json();

  if (record.role !== 'user') {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const supabase = await createServiceClient();

  // Fetch datasources (including stored content for fallback), org settings, and thread.
  const [{ data: datasources }, { data: org }, { data: thread }, { data: apiConnections }] =
    await Promise.all([
      supabase
        .from('datasource')
        .select('id, url')
        .eq('organization_id', record.organization_id),
      supabase
        .from('organization')
        .select('autopilot_enabled, autopilot_threshold, tone_policy')
        .eq('id', record.organization_id)
        .single(),
      supabase
        .from('thread')
        .select('email_from, subject, message_id')
        .eq('id', record.thread_id)
        .single(),
      supabase
        .from('api_connection')
        .select('id, name, base_url, api_key, description')
        .eq('organization_id', record.organization_id),
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
      `<p>Thank you for reaching out. I wasn't able to find specific information to fully answer your question at this time. Could you please provide more details or clarify your request so we can assist you better?</p>`
    );
  }

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

  // --- Agent 0: API Routing ---
  // Determine if any connected API should be called for live customer data.
  let apiDataContext = '';
  if (apiConnections && apiConnections.length > 0) {
    const routingDecision = await runApiRoutingAgent(
      thread?.subject ?? '',
      record.cleaned_body,
      apiConnections
    );

    if (routingDecision) {
      const chosenConnection = apiConnections.find(
        (c) => c.id === routingDecision.api_id
      );
      if (chosenConnection) {
        const apiResponse = await callExternalApi(
          chosenConnection,
          routingDecision.endpoint,
          routingDecision.query_params ?? {}
        );
        if (apiResponse) {
          apiDataContext = `Live API data from ${chosenConnection.name}:\n${apiResponse}`;
        }
      }
    }
  }

  // --- Agentic RAG: Retrieval ---
  // Step 1: Embed the customer question and search the section table for
  //         semantically similar pre-indexed content chunks.
  const questionText = `${thread?.subject ?? ''}\n${record.cleaned_body}`;
  const matchedSections = await retrieveSections(
    supabase,
    record.organization_id,
    questionText
  );

  let findings: string = '';
  let confidence: number = URL_CONTEXT_FALLBACK_CONFIDENCE;
  let citations: string[] = [];

  if (matchedSections.length > 0) {
    const sectionContext = matchedSections
      .map((s) => s.content)
      .join('\n\n---\n\n');

    const combinedContext = apiDataContext
      ? `${apiDataContext}\n\n---\n\n${sectionContext}`
      : sectionContext;

    findings = await runResearchAgentWithSections(
      thread?.subject ?? '',
      record.cleaned_body,
      combinedContext
    );

    confidence = computeVectorConfidence(
      matchedSections.map((s) => s.similarity)
    );

    const matchedDatasourceIds = [
      ...new Set(matchedSections.map((s) => s.datasource_id)),
    ];
    citations = datasources
      .filter((d) => matchedDatasourceIds.includes(d.id))
      .map((d) => d.url);
  } else if (apiDataContext) {
    // No vector matches but API data is available — use it directly as findings
    findings = await runResearchAgentWithContent(
      thread?.subject ?? '',
      record.cleaned_body,
      apiDataContext
    );
    confidence = URL_CONTEXT_FALLBACK_CONFIDENCE;
  }

  // Determine whether autopilot should auto-send this reply
  const autopilotEnabled = org?.autopilot_enabled ?? false;
  const autopilotThreshold = org?.autopilot_threshold ?? 0.65;
  const tonePolicy = org?.tone_policy ?? null;
  const shouldAutoSend = autopilotEnabled && confidence >= autopilotThreshold;

  // --- Agent 2: Writing ---
  // Take the research findings and produce a polished HTML reply.
  const rawContent = await runWritingAgent(
    thread?.subject ?? '',
    record.cleaned_body,
    findings,
    conversationHistory,
    tonePolicy
  );

  if (!rawContent || rawContent.trim() === 'NO_INFORMATION') {
    // Writing agent couldn't produce a response – fall back to clarifying draft
    return insertClarifyingDraft(
      supabase,
      record.organization_id,
      record.thread_id
    );
  }

  const htmlContent = rawContent.replace(/^```html\s*|\s*```$/g, '');

  if (shouldAutoSend) {
    // Auto-send: use the already-fetched thread to send the email
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
