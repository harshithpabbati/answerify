import { generateEmbeddings, serializeEmbedding } from '@/lib/embeddings';
import { processMarkdown } from '@/lib/processMarkdown';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Webhook triggered when a new datasource row is inserted.
 *
 * 1. Sets status to 'processing'
 * 2. Fetches the URL content as markdown via markdown.new
 * 3. Chunks with processMarkdown (splits by headings)
 * 4. Generates embeddings via the configured embedding model
 * 5. Inserts sections into the `section` table
 * 6. Sets status to 'ready' (or 'error' on failure)
 *
 * Using markdown.new to convert web pages to clean markdown preserves
 * document structure (headings, lists, etc.) so processMarkdown can
 * split content into semantically meaningful sections.
 */
export async function POST(request: Request) {
  const { record } = await request.json();
  const supabase = await createServiceClient();

  // Mark as processing
  await supabase
    .from('datasource')
    .update({ status: 'processing' })
    .eq('id', record.id);

  // Fetch the URL content as markdown via markdown.new
  let textContent: string;
  try {
    const response = await fetch(`https://r.jina.ai/${record.url}`, {
      headers: {
        'User-Agent': 'Answerify/1.0 (knowledge-base indexer)',
        'X-Return-Format': 'markdown',
      },
    });
    if (!response.ok) {
      throw new Error(`markdown.new returned ${response.status}`);
    }
    textContent = (await response.text()).trim();
  } catch (error) {
    console.error('Failed to fetch datasource URL:', error);
    await supabase
      .from('datasource')
      .update({ status: 'error' })
      .eq('id', record.id);
    return new Response(JSON.stringify({ error: 'Failed to fetch URL' }), {
      status: 500,
    });
  }

  if (!textContent) {
    await supabase
      .from('datasource')
      .update({ status: 'ready' })
      .eq('id', record.id);
    return new Response(
      JSON.stringify({ ok: true, message: 'No content found' }),
      { status: 200 }
    );
  }

  // Chunk content into sections
  const { sections } = processMarkdown(textContent);
  if (sections.length === 0) {
    await supabase
      .from('datasource')
      .update({ status: 'ready' })
      .eq('id', record.id);
    return new Response(
      JSON.stringify({ ok: true, message: 'No sections produced' }),
      { status: 200 }
    );
  }

  // Generate embeddings for all sections
  let embeddings: number[][];
  try {
    embeddings = await generateEmbeddings(sections.map((s) => s.content));
  } catch (error) {
    console.error('Failed to generate embeddings:', error);
    await supabase
      .from('datasource')
      .update({ status: 'error' })
      .eq('id', record.id);
    return new Response(
      JSON.stringify({ error: 'Failed to generate embeddings' }),
      { status: 500 }
    );
  }

  // Insert sections with embeddings
  const sectionRows = sections.map((s, i) => ({
    datasource_id: record.id,
    organization_id: record.organization_id,
    content: s.content,
    heading: s.heading ?? null,
    embedding: serializeEmbedding(embeddings[i]),
  }));

  const { error } = await supabase.from('section').insert(sectionRows);
  if (error) {
    console.error('Failed to insert sections:', error);
    await supabase
      .from('datasource')
      .update({ status: 'error' })
      .eq('id', record.id);
    return new Response(JSON.stringify({ error: 'Failed to store sections' }), {
      status: 500,
    });
  }

  await supabase
    .from('datasource')
    .update({ status: 'ready' })
    .eq('id', record.id);

  return new Response(JSON.stringify({ ok: true, sections: sections.length }), {
    status: 200,
  });
}
