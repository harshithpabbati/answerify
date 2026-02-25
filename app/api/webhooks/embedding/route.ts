import { GoogleGenerativeAI } from '@google/generative-ai';
import { Tables } from '@/database.types';

import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'edge';

function getGeminiClient() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
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

  const genAI = getGeminiClient();
  const embeddingModel = genAI.getGenerativeModel({
    model: 'text-embedding-004',
  });

  await Promise.allSettled(
    records.map(async (record: Tables<'section'>) => {
      const result = await embeddingModel.embedContent(record.content);
      const embedding = result.embedding.values;

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

