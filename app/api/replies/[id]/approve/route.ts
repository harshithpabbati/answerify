import { GoogleGenAI } from '@google/genai';

import { generateEmbeddings } from '@/lib/embeddings';
import { processMarkdown } from '@/lib/processMarkdown';
import { createServiceClient } from '@/lib/supabase/service';

function getGenAIClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const { content } = await request.json();

  const supabase = await createServiceClient();

  const { data: reply, error: fetchError } = await supabase
    .from('reply')
    .select('content, status, organization_id')
    .eq('id', id)
    .single();

  if (fetchError || !reply) {
    return new Response(JSON.stringify({ error: 'Reply not found' }), {
      status: 404,
    });
  }

  // Mark as approved and record whether the human edited the AI draft
  const isPerfect = reply.content === content;
  const { data, error } = await supabase
    .from('reply')
    .update({
      content,
      status: reply.status === 'sent' ? 'sent' : 'approved',
      is_perfect: isPerfect,
    })
    .eq('id', id)
    .select()
    .single();

  // --- Learning Loop ---
  // Store edit log and feed the approved content back into the knowledge base
  // so future vector searches can retrieve it.
  try {
    // Record the edit when the human changed the AI draft
    if (!isPerfect) {
      await supabase.from('reply_edit').insert({
        reply_id: id,
        organization_id: reply.organization_id,
        original_content: reply.content,
        final_content: content,
      } as never);
    }

    // Find or create an internal knowledge-base datasource for this org
    let { data: kbSource } = await supabase
      .from('datasource')
      .select('id')
      .eq('organization_id', reply.organization_id)
      .eq('is_internal_kb', true)
      .single();

    if (!kbSource) {
      const { data: newSource } = await supabase
        .from('datasource')
        .insert({
          organization_id: reply.organization_id,
          url: 'internal://knowledge-base',
          is_internal_kb: true,
        } as never)
        .select('id')
        .single();
      kbSource = newSource;
    }

    if (kbSource) {
      // Chunk the approved content and generate embeddings
      const { sections } = processMarkdown(content);
      if (sections.length > 0) {
        const ai = getGenAIClient();
        const embeddings = await generateEmbeddings(
          ai,
          sections.map((s) => s.content),
        );

        const sectionRows = sections.map((s, i) => ({
          datasource_id: kbSource.id,
          organization_id: reply.organization_id,
          content: s.content,
          heading: s.heading ?? null,
          embedding: `[${embeddings[i].join(',')}]`,
        }));

        await supabase.from('section').insert(sectionRows as never);
      }
    }
  } catch (err) {
    // Learning loop failures should not block the approval response
    console.error('Learning loop failed:', err);
  }

  return new Response(JSON.stringify({ data, error }), { status: 200 });
}
