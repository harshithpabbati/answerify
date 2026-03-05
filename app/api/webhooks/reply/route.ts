import { generateText } from 'ai';
import { codeBlock } from 'common-tags';
import { Resend } from 'resend';

import { textModel } from '@/lib/ai';
import { URL_CONTEXT_FALLBACK_CONFIDENCE } from '@/lib/autopilot';
import { cleanBody } from '@/lib/cleanBody';
import { generateEmbedding, serializeEmbedding } from '@/lib/embeddings';
import { parseLLMJSON } from '@/lib/parse-llm-json';
import { createServiceClient } from '@/lib/supabase/service';

/* -------------------------------------------------------------------------- */
/*                                  UTILITIES                                 */
/* -------------------------------------------------------------------------- */

function computeVectorConfidence(similarities: number[]): number {
  if (!similarities.length) return 0;
  const avg = similarities.reduce((a, b) => a + b, 0) / similarities.length;
  return Math.min(0.99, Math.max(0, avg));
}

function blendConfidence(
  vectorConfidence: number,
  modelConfidence: number
): number {
  return Math.min(
    0.99,
    Math.max(0, vectorConfidence * 0.5 + modelConfidence * 0.5)
  );
}

const CLARIFYING_HTML = `<p>Thank you for reaching out. I wasn't able to find enough information to fully answer your question. Could you please provide a bit more detail so we can assist you better?</p>`;

/** Similarity assigned to neighbor sections fetched for context expansion (not vector-matched themselves). */
const NEIGHBOR_SIMILARITY = 0;

/** Validates a UUID string before interpolating it into a Supabase filter expression. */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* -------------------------------------------------------------------------- */
/*                             VECTOR RETRIEVAL                               */
/* -------------------------------------------------------------------------- */

async function retrieveSections(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  organizationId: string,
  query: string
) {
  const embedding = await generateEmbedding(query);
  if (!embedding.length || embedding.length === 0) return [];

  const { data, error } = await supabase.rpc('match_sections', {
    embedding: serializeEmbedding(embedding),
    match_threshold: 0.1,
    p_organization_id: organizationId,
    match_count: 8,
  });

  if (error) {
    console.error('Vector search failed:', error);
    return [];
  }

  const matched = (data ?? []) as Array<{
    content: string;
    datasource_id: string;
    heading: string | null;
    id: string;
    position: number;
    similarity: number;
  }>;

  if (matched.length === 0) return matched;

  // Expand context by fetching the immediate neighbors (position ± 1) of each
  // matched section within the same datasource. This ensures the LLM receives
  // the surrounding context even when the most relevant sentence falls at a
  // chunk boundary.
  const matchedIds = new Set(matched.map((s) => s.id));

  // Build a single OR-filter covering all (datasource_id, position) neighbor pairs
  // to avoid N individual round-trips. datasource_id values are validated against
  // a UUID regex before interpolation as a defense-in-depth measure.
  const neighborFilter = matched
    .flatMap((s) => {
      if (!UUID_REGEX.test(s.datasource_id)) return [];
      return [s.position - 1, s.position + 1]
        .filter((pos) => pos >= 0)
        .map(
          (pos) => `and(datasource_id.eq.${s.datasource_id},position.eq.${pos})`
        );
    })
    .join(',');

  const neighborData: Array<{
    id: string;
    datasource_id: string;
    content: string;
    heading: string | null;
    position: number;
  }> = [];

  if (neighborFilter) {
    const { data } = await supabase
      .from('section')
      .select('id, datasource_id, content, heading, position')
      .or(neighborFilter);
    if (data) neighborData.push(...data);
  }

  // Deduplicate neighbors, excluding sections already in the matched set
  const seenIds = new Set(matchedIds);
  const uniqueNeighbors: Array<{
    id: string;
    datasource_id: string;
    content: string;
    heading: string | null;
    position: number;
  }> = [];

  for (const n of neighborData) {
    if (!seenIds.has(n.id)) {
      seenIds.add(n.id);
      uniqueNeighbors.push(n);
    }
  }

  // Merge matched sections with neighbors, grouped by datasource and ordered
  // by position so the LLM sees coherent, in-order context blocks.
  const allSections = [
    ...matched,
    ...uniqueNeighbors.map((n) => ({ ...n, similarity: NEIGHBOR_SIMILARITY })),
  ].sort((a, b) => {
    if (a.datasource_id !== b.datasource_id)
      return a.datasource_id.localeCompare(b.datasource_id);
    return a.position - b.position;
  });

  return allSections;
}

/* -------------------------------------------------------------------------- */
/*                               API ROUTING                                  */
/* -------------------------------------------------------------------------- */

async function runApiRoutingAgent(
  subject: string,
  question: string,
  apiConnections: Array<{
    id: string;
    name: string;
    base_url: string;
    description: string | null;
  }>
) {
  if (!apiConnections.length || apiConnections.length === 0) return null;

  const apiList = apiConnections
    .map(
      (c) =>
        `- id: ${c.id}\n  name: ${c.name}\n  description: ${c.description ?? 'No description'}`
    )
    .join('\n');

  const { text } = await generateText({
    model: textModel,
    temperature: 0,
    maxOutputTokens: 256,
    system: codeBlock`
      You are an API routing assistant.

      If the question clearly requires live personalized data,
      return JSON:
      { "api_id": "...", "endpoint": "...", "query_params": {} }

      Otherwise return:
      NONE
    `,
    prompt: `Subject: ${subject}\nQuestion:\n${question}\n\nAPIs:\n${apiList}`,
  });

  const trimmed = text.trim();
  if (trimmed === 'NONE') return null;

  try {
    return parseLLMJSON(trimmed);
  } catch {
    return null;
  }
}

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
    return body.length > 4000 ? body.slice(0, 4000) : body;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                        SINGLE PASS GROUNDED ANSWER                         */
/* -------------------------------------------------------------------------- */

async function runGroundedAnswerAgent({
  subject,
  question,
  retrievedContext,
  apiContext,
  conversationHistory,
  tonePolicy,
}: {
  subject: string;
  question: string;
  retrievedContext: string;
  apiContext?: string;
  conversationHistory?: string;
  tonePolicy?: string | null;
}) {
  const systemPrompt = codeBlock`
    You are a grounded customer support AI.

    RULES:
    - Base your answer on the provided context sections.
    - Do NOT invent information beyond what the context supports.
    - If the context contains ANY relevant information, provide the best
      possible answer and reflect your certainty in the confidence score.
    - ONLY return NO_INFORMATION when the context is completely unrelated
      to the question and you truly cannot provide any useful answer.
    - Output valid JSON only — no explanation, no markdown fences.

    If answerable (even partially), return:
    {
      "status": "ANSWER",
      "html": "<p>...</p>",
      "confidence": 0.0 to 1.0
    }

    Only if the context is entirely irrelevant, return:
    { "status": "NO_INFORMATION", "confidence": 0 }
  `;

  const { text } = await generateText({
    model: textModel,
    temperature: 0.5,
    maxOutputTokens: 2000,
    system: systemPrompt,
    prompt: `
      Subject: ${subject}

      Customer question:
      ${question}

      ${conversationHistory ? `Conversation history:\n${conversationHistory}\n` : ''}

      ${apiContext ? `Live API data:\n${apiContext}\n` : ''}

      Retrieved knowledge base sections:
      ${retrievedContext}

      Tone policy:
      ${tonePolicy ?? 'Friendly, clear, and professional'}
    `,
  });

  try {
    return parseLLMJSON(text);
  } catch (err) {
    console.error('[reply] Failed to parse LLM JSON response:', err, '\nRaw text:', text);
    return { status: 'NO_INFORMATION', confidence: 0 };
  }
}

/* -------------------------------------------------------------------------- */
/*                                   HANDLER                                  */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const { record } = await request.json();

  if (record.role !== 'user') {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const supabase = await createServiceClient();

  const [
    { data: datasources },
    { data: org },
    { data: thread },
    { data: apiConnections },
    { data: threadEmails },
  ] = await Promise.all([
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
    supabase
      .from('email')
      .select('role, cleaned_body')
      .eq('thread_id', record.thread_id)
      .order('created_at'),
  ]);

  const conversationHistory =
    threadEmails
      ?.map(
        (e) =>
          `${e.role === 'user' ? 'Customer' : 'Support'}: ${e.cleaned_body}`
      )
      .join('\n\n') ?? '';

  const questionText = `${thread?.subject ?? ''}\n${record.cleaned_body}`;

  /* --------------------------- API ROUTING STEP --------------------------- */

  let apiContext = '';

  const routingDecision = await runApiRoutingAgent(
    thread?.subject ?? '',
    record.cleaned_body,
    apiConnections ?? []
  );

  if (routingDecision) {
    const chosenConnection = apiConnections?.find(
      (c) => c.id === routingDecision.api_id
    );

    if (chosenConnection) {
      const apiResponse = await callExternalApi(
        chosenConnection,
        routingDecision.endpoint,
        routingDecision.query_params ?? {}
      );

      if (apiResponse) {
        apiContext = apiResponse;
      }
    }
  }

  /* -------------------------- VECTOR RETRIEVAL --------------------------- */

  const matchedSections = await retrieveSections(
    supabase,
    record.organization_id,
    questionText
  );

  const vectorConfidence = computeVectorConfidence(
    matchedSections.filter((s) => s.similarity > 0).map((s) => s.similarity)
  );

  const retrievedContext = matchedSections
    .map((s) => s.content)
    .join('\n\n---\n\n');

  /* ------------------------ GROUNDED ANSWER AGENT ------------------------ */

  const answerResult = await runGroundedAnswerAgent({
    subject: thread?.subject ?? '',
    question: record.cleaned_body,
    retrievedContext,
    apiContext,
    conversationHistory,
    tonePolicy: org?.tone_policy,
  });

  if (answerResult.status !== 'ANSWER') {
    const { data } = await supabase
      .from('reply')
      .insert({
        organization_id: record.organization_id,
        thread_id: record.thread_id,
        content: CLARIFYING_HTML,
        status: 'draft',
        confidence_score: 0,
        citations: [],
      })
      .select()
      .single();

    return new Response(JSON.stringify({ data }), { status: 200 });
  }

  const finalConfidence = blendConfidence(
    vectorConfidence || URL_CONTEXT_FALLBACK_CONFIDENCE,
    answerResult.confidence
  );

  const autopilotEnabled = org?.autopilot_enabled ?? false;
  const autopilotThreshold = org?.autopilot_threshold ?? 0.7;
  const shouldAutoSend =
    autopilotEnabled && finalConfidence >= autopilotThreshold;

  const htmlContent = answerResult.html;

  /* ----------------------------- AUTO SEND ------------------------------- */

  if (shouldAutoSend && thread) {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const sent = await resend.emails.send({
      from: 'Support <support@answerify.dev>',
      to: [thread.email_from],
      subject: thread.subject,
      html: htmlContent,
      headers: { 'In-Reply-To': thread.message_id },
    });

    if (sent?.data?.id) {
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
    }
  }

  /* --------------------------- SAVE REPLY ROW ---------------------------- */

  const { data } = await supabase
    .from('reply')
    .insert({
      organization_id: record.organization_id,
      thread_id: record.thread_id,
      content: htmlContent,
      status: shouldAutoSend ? 'sent' : 'draft',
      confidence_score: finalConfidence,
      citations:
        datasources
          ?.filter((d) => matchedSections.some((s) => s.datasource_id === d.id))
          .map((d) => d.url) ?? [],
    })
    .select()
    .single();

  /* ----------------------- LEARNING LOOP TRIGGER ------------------------ */

  if (shouldAutoSend && data?.id) {
    fetch(`${origin}/api/replies/${data.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: htmlContent }),
    }).catch(() => {});
  }

  return new Response(JSON.stringify({ data }), { status: 200 });
}
