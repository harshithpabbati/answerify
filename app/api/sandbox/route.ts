import { generateText } from 'ai';
import { codeBlock } from 'common-tags';

import { textModel } from '@/lib/ai';
import { generateEmbedding, serializeEmbedding } from '@/lib/embeddings';
import { createServerClient } from '@/lib/supabase/server';

const VECTOR_CONFIDENCE_THRESHOLD = 0.65;
const MIN_VECTOR_MATCHES = 2;

/**
 * POST /api/sandbox
 *
 * Runs the full Research + Writing Agent pipeline for a user-supplied question
 * without persisting anything to the database.  Used by the Test Sandbox UI so
 * that org admins can preview how the AI would respond to a real customer email.
 *
 * Body: { orgId: string; question: string; subject?: string }
 * Response: { html: string } | { error: string }
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { orgId, question, subject = 'Preview' } = body ?? {};

  if (!orgId || !question) {
    return new Response(
      JSON.stringify({ error: 'orgId and question are required' }),
      { status: 400 }
    );
  }

  const supabase = await createServerClient();

  // Fetch datasources and org tone_policy
  const [{ data: datasources }, { data: org }] = await Promise.all([
    supabase.from('datasource').select('id, url').eq('organization_id', orgId),
    supabase
      .from('organization')
      .select('tone_policy')
      .eq('id', orgId)
      .single(),
  ]);

  const tonePolicy = org?.tone_policy ?? null;

  // --- Retrieval ---
  const questionText = `${subject}\n${question}`;
  let findings = '';

  if (datasources && datasources.length > 0) {
    const questionEmbedding = await generateEmbedding(questionText);
    let highQualityMatches: Array<{
      content: string;
      datasource_id: string;
      similarity: number;
    }> = [];

    if (questionEmbedding.length > 0) {
      const { data: sections } = await supabase.rpc('match_sections', {
        embedding: serializeEmbedding(questionEmbedding),
        match_threshold: 0.4,
        p_organization_id: orgId,
        match_count: 5,
      });

      highQualityMatches = (
        (sections ?? []) as Array<{
          content: string;
          datasource_id: string;
          similarity: number;
        }>
      ).filter((s) => s.similarity >= VECTOR_CONFIDENCE_THRESHOLD);
    }

    if (highQualityMatches.length >= MIN_VECTOR_MATCHES) {
      const sectionContext = highQualityMatches
        .map((s) => s.content)
        .join('\n\n---\n\n');
      findings = await runResearchAgent(subject, question, sectionContext);
    }
  }

  if (!findings || findings.trim() === 'NO_INFORMATION') {
    return new Response(
      JSON.stringify({
        html: '<p>No relevant information found in the knowledge base for this question.</p>',
      }),
      { status: 200 }
    );
  }

  const rawContent = await runWritingAgent(
    subject,
    question,
    findings,
    tonePolicy
  );

  if (!rawContent || rawContent.trim() === 'NO_INFORMATION') {
    return new Response(
      JSON.stringify({
        html: '<p>The AI was unable to generate a preview reply for this question.</p>',
      }),
      { status: 200 }
    );
  }

  const html = rawContent.replace(/^```html\s*|\s*```$/g, '');
  return new Response(JSON.stringify({ html }), { status: 200 });
}

async function runResearchAgent(
  subject: string,
  question: string,
  context: string
): Promise<string> {
  const { text } = await generateText({
    model: textModel,
    system: codeBlock`
      You are a research assistant for a customer support team.
      Your job is to find and extract the most relevant information from the
      provided knowledge base content to answer a customer's question.

      - Extract only information that is directly relevant to the question
      - Organise the findings as concise bullet points or short paragraphs
      - Include specific details: steps, values, settings, or policies that apply
      - Do not write the final reply – only gather and present the raw facts
      - If no relevant information can be found, respond with only: NO_INFORMATION
    `,
    prompt: `Subject: ${subject}\nCustomer question:\n${question}\n\nKnowledge base content:\n${context}`,
    maxOutputTokens: 1024,
    temperature: 0.3,
  });
  return text;
}

async function runWritingAgent(
  subject: string,
  question: string,
  findings: string,
  tonePolicy?: string | null
): Promise<string> {
  const tonePolicySection = tonePolicy?.trim()
    ? `\n\n    Org tone and policy rules (follow strictly):\n    ${tonePolicy.trim()}`
    : '';

  const { text } = await generateText({
    model: textModel,
    system: codeBlock`
      You are a friendly and helpful customer support agent. You write like a real person,
      not a documentation bot. Keep your tone warm, conversational, and to the point.

      When answering:
      - Address the customer directly
      - Don't use section headers or bold titles unless truly necessary
      - Avoid bullet points for simple answers; use them only when listing steps or options
      - Don't narrate what you're about to do
      - Get straight to the answer
      - Keep it concise but complete
      - Do not include citation markers like [cite: 1] or [1] inline in the text

      You must base your reply solely on the research findings provided below.
      Do not invent information that is not present in the findings.

      If the findings do not contain enough information to answer the question,
      respond with only the text: NO_INFORMATION
      Do not explain why. Do not apologize. Do not add anything else.
      ${tonePolicySection}
      Reply back in HTML and nothing else, avoid using markdown.
      Format the response as follows:
      - Use <p> tags for each distinct topic or thought
      - Use <ul> and <li> only for genuine lists (3+ items or step-by-step options)
      - Add a short friendly opening line in its own <p>
      - Keep paragraphs short (2-4 sentences max)
      - Do not use <h1>, <h2>, <h3> tags
      - Avoid signature at the end of the reply
      - Do not output anything outside of the HTML response
    `,
    prompt: `Subject: ${subject}\nCustomer question:\n${question}\n\nResearch findings:\n${findings}`,
    maxOutputTokens: 1024,
    temperature: 0.7,
  });
  return text;
}
