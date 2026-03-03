import { generateText } from 'ai';
import { codeBlock } from 'common-tags';

import { textModel } from '@/lib/ai';
import { URL_CONTEXT_FALLBACK_CONFIDENCE } from '@/lib/autopilot';
import { generateEmbedding, serializeEmbedding } from '@/lib/embeddings';
import { createServerClient } from '@/lib/supabase/server';

/**
 * POST /api/sandbox
 *
 * Runs the full grounded-answer pipeline for a user-supplied question without
 * persisting anything to the database. Used by the Test Sandbox page so that
 * org admins can preview how the AI would respond to a real customer email,
 * including full confidence breakdown and matched knowledge base sections.
 *
 * Body: { orgId: string; question: string; subject?: string }
 * Response: {
 *   html: string;
 *   confidence: number;
 *   vectorConfidence: number;
 *   modelConfidence: number;
 *   citations: string[];
 *   sections: Array<{ content: string; similarity: number; datasourceUrl?: string }>;
 * } | { error: string }
 */

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

/* -------------------------------------------------------------------------- */
/*                        SINGLE PASS GROUNDED ANSWER                         */
/* -------------------------------------------------------------------------- */

async function runGroundedAnswerAgent({
  subject,
  question,
  retrievedContext,
  tonePolicy,
}: {
  subject: string;
  question: string;
  retrievedContext: string;
  tonePolicy?: string | null;
}) {
  const systemPrompt = codeBlock`
    You are a grounded customer support AI.

    RULES:
    - Use ONLY the provided context.
    - Do NOT invent information.
    - If the answer is not fully supported, return:
      { "status": "NO_INFORMATION", "confidence": 0 }
    - Output valid JSON only.

    If answerable, return:
    {
      "status": "ANSWER",
      "html": "<p>...</p>",
      "confidence": 0.0 to 1.0
    }
  `;

  const { text } = await generateText({
    model: textModel,
    temperature: 0.5,
    maxOutputTokens: 700,
    system: systemPrompt,
    prompt: `
      Subject: ${subject}

      Customer question:
      ${question}

      Retrieved knowledge base sections:
      ${retrievedContext}

      Tone policy:
      ${tonePolicy ?? 'Friendly, clear, and professional'}
    `,
  });

  try {
    return JSON.parse(text);
  } catch {
    return { status: 'NO_INFORMATION', confidence: 0 };
  }
}

/* -------------------------------------------------------------------------- */
/*                                   HANDLER                                  */
/* -------------------------------------------------------------------------- */

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

  const [{ data: datasources }, { data: org }] = await Promise.all([
    supabase.from('datasource').select('id, url').eq('organization_id', orgId),
    supabase
      .from('organization')
      .select('tone_policy')
      .eq('id', orgId)
      .single(),
  ]);

  const tonePolicy = org?.tone_policy ?? null;
  const questionText = `${subject}\n${question}`;

  /* -------------------------- VECTOR RETRIEVAL --------------------------- */

  const matchedSections: Array<{
    content: string;
    datasource_id: string;
    similarity: number;
  }> = [];

  if (datasources && datasources.length > 0) {
    const embedding = await generateEmbedding(questionText);
    if (embedding.length > 0) {
      const { data } = await supabase.rpc('match_sections', {
        embedding: serializeEmbedding(embedding),
        match_threshold: 0.1,
        p_organization_id: orgId,
        match_count: 8,
      });
      if (data) matchedSections.push(...data);
    }
  }

  const vectorConfidence = computeVectorConfidence(
    matchedSections.map((s) => s.similarity)
  );
  const retrievedContext = matchedSections
    .map((s) => s.content)
    .join('\n\n---\n\n');

  const citations =
    datasources
      ?.filter((d) => matchedSections.some((s) => s.datasource_id === d.id))
      .map((d) => d.url) ?? [];

  const sections = matchedSections.map((s) => ({
    content: s.content,
    similarity: s.similarity,
    datasourceUrl: datasources?.find((d) => d.id === s.datasource_id)?.url,
  }));

  if (!retrievedContext.trim()) {
    return new Response(
      JSON.stringify({
        html: '<p>No relevant information found in the knowledge base for this question.</p>',
        confidence: 0,
        vectorConfidence: 0,
        modelConfidence: 0,
        citations: [],
        sections: [],
      }),
      { status: 200 }
    );
  }

  /* ------------------------ GROUNDED ANSWER AGENT ------------------------ */

  const answerResult = await runGroundedAnswerAgent({
    subject,
    question,
    retrievedContext,
    tonePolicy,
  });

  if (answerResult.status !== 'ANSWER') {
    return new Response(
      JSON.stringify({
        html: '<p>The AI was unable to generate a reply based on the available knowledge base content.</p>',
        confidence: 0,
        vectorConfidence,
        modelConfidence: 0,
        citations: [],
        sections,
      }),
      { status: 200 }
    );
  }

  const modelConfidence = answerResult.confidence ?? 0;
  const finalConfidence = blendConfidence(
    vectorConfidence || URL_CONTEXT_FALLBACK_CONFIDENCE,
    modelConfidence
  );

  return new Response(
    JSON.stringify({
      html: answerResult.html,
      confidence: finalConfidence,
      vectorConfidence,
      modelConfidence,
      citations,
      sections,
    }),
    { status: 200 }
  );
}
