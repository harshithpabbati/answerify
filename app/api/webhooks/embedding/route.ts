import { GoogleGenAI } from '@google/genai';
import { Tables } from '@/database.types';

import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'edge';

function getGenAIClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

export async function POST() {
  const supabase = await createServiceClient();
  const { data: records } = await supabase
    .from('section')
    .select()
    .is('embedding', null);

  if (!records || records?.length === 0) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const ai = getGenAIClient();

  await Promise.allSettled(
    records.map(async (record: Tables<'section'>) => {
      const result = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: record.content,
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

