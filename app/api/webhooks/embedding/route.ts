import { Tables } from '@/database.types';
import { GoogleGenAI } from '@google/genai';

import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'edge';

function getGenAIClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

export async function POST(request: Request) {
  const supabase = await createServiceClient();

  let records: Tables<'section'>[] | null = null;
  try {
    const body = await request.json();
    if (Array.isArray(body?.records) && body.records.length > 0) {
      records = body.records;
    }
  } catch {
    // no body or invalid JSON — fall through to DB fetch
  }

  if (!records) {
    const { data } = await supabase
      .from('section')
      .select()
      .is('embedding', null);
    records = data;
  }

  if (!records || records?.length === 0) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const ai = getGenAIClient();

  await Promise.allSettled(
    records.map(async (record: Tables<'section'>) => {
      const result = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: record.content,
        config: {
          outputDimensionality: 768,
          taskType: 'RETRIEVAL_DOCUMENT',
        },
      });
      const embedding = result.embeddings?.[0]?.values;

      await supabase
        .from('section')
        .update({ embedding: embedding as any })
        .match({ id: record.id })
        .select('id');

      return { id: record.id, success: true };
    })
  );

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
