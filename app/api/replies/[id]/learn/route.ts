import OpenAI from 'openai';

import { processMarkdown } from '@/lib/processMarkdown';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createServiceClient();

  const { data: reply, error: replyError } = await supabase
    .from('reply')
    .select('*')
    .eq('id', id)
    .single();

  if (replyError || !reply) {
    return new Response(JSON.stringify({ error: 'Reply not found' }), {
      status: 404,
    });
  }

  // Check for existing edit log to get the final human-approved content
  const { data: editLog } = await supabase
    .from('reply_edit')
    .select('final_content')
    .eq('reply_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const learnContent = editLog?.final_content ?? reply.content;

  // Find or create an internal KB datasource for the organization
  let { data: kbDatasource } = await supabase
    .from('datasource')
    .select('id')
    .eq('organization_id', reply.organization_id)
    .eq('is_internal_kb', true)
    .single();

  if (!kbDatasource) {
    const { data: newKb, error: kbError } = await supabase
      .from('datasource')
      .insert({
        organization_id: reply.organization_id,
        url: 'internal://kb',
        title: 'Internal Knowledge Base',
        is_internal_kb: true,
        content: learnContent,
      })
      .select()
      .single();

    if (kbError || !newKb) {
      return new Response(
        JSON.stringify({ error: 'Failed to create KB datasource' }),
        { status: 500 }
      );
    }
    kbDatasource = newKb;
  } else {
    // Append to existing KB
    const { data: existing } = await supabase
      .from('datasource')
      .select('content')
      .eq('id', kbDatasource.id)
      .single();

    const updatedContent = existing?.content
      ? `${existing.content}\n\n---\n\n${learnContent}`
      : learnContent;

    await supabase
      .from('datasource')
      .update({ content: updatedContent })
      .eq('id', kbDatasource.id);
  }

  // Chunk content into sections and generate embeddings
  const { sections } = processMarkdown(learnContent);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY! });

  for (const section of sections) {
    if (!section.content.trim()) continue;

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: section.content,
    });

    const embedding = embeddingResponse.data?.[0]?.embedding;
    if (!embedding) continue;

    await supabase.from('section').insert({
      datasource_id: kbDatasource.id,
      organization_id: reply.organization_id,
      content: section.content,
      embedding: embedding as any,
    });
  }

  // Mark edit log as learned
  await supabase
    .from('reply_edit')
    .update({ learned: true })
    .eq('reply_id', id);

  return new Response(
    JSON.stringify({ ok: true, sections_added: sections.length }),
    { status: 200 }
  );
}
