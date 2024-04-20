import OpenAI from 'openai';

import { createServiceClient } from '@/lib/supabase/service';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY!,
});

export async function POST(request: Request) {
  const { record } = await request.json();

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: record.content,
  });

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from('section')
    .update({ embedding: response.data?.[0].embedding as any })
    .match({ id: record.id })
    .select('id');

  return new Response(JSON.stringify({ data, error }), { status: 200 });
}
