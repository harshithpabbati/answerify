import { Tables } from '@/database.types';
import OpenAI from 'openai';

import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'edge';

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_KEY!,
  });
}

export async function POST() {
  const openai = getOpenAI();
  const supabase = await createServiceClient();
  const { data: records } = await supabase
    .from('section')
    .select()
    .is('embedding', null);

  if (!records || records?.length === 0) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  await Promise.allSettled(
    records.map(async (record: Tables<'section'>) => {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: record.content,
      });

      await supabase
        .from('section')
        .update({ embedding: response.data?.[0].embedding as any })
        .match({ id: record.id })
        .select('id');

      return { id: record.id, success: true };
    })
  );

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
