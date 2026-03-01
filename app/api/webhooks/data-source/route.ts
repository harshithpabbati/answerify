import { GoogleGenAI } from '@google/genai';

import { generateEmbeddings, serializeEmbedding } from '@/lib/embeddings';
import { processMarkdown } from '@/lib/processMarkdown';
import { createServiceClient } from '@/lib/supabase/service';

function getGenAIClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

/**
 * Webhook triggered when a new datasource row is inserted.
 *
 * 1. Fetches the URL content as markdown via markdown.new
 * 2. Chunks with processMarkdown (splits by headings)
 * 3. Generates embeddings via Gemini
 * 4. Inserts sections into the `section` table
 *
 * Using markdown.new to convert web pages to clean markdown preserves
 * document structure (headings, lists, etc.) so processMarkdown can
 * split content into semantically meaningful sections.
 */
export async function POST(request: Request) {
  const { record } = await request.json();
  const supabase = await createServiceClient();
  const ai = getGenAIClient();

  // Fetch the URL content as markdown via markdown.new
  let textContent: string;
  try {
    const response = await fetch(`https://markdown.new/${record.url}`, {
      headers: { 'User-Agent': 'Answerify/1.0 (knowledge-base indexer)' },
    });
    if (!response.ok) {
      throw new Error(`markdown.new returned ${response.status}`);
    }
    textContent = (await response.text()).trim();
  } catch (error) {
    console.error('Failed to fetch datasource URL:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch URL' }), {
      status: 500,
    });
  }

  if (!textContent) {
    return new Response(
      JSON.stringify({ ok: true, message: 'No content found' }),
      { status: 200 },
    );
  }

  // Update datasource row with scraped content
  await supabase
    .from('datasource')
    .update({ content: textContent } as never)
    .eq('id', record.id);

  // Chunk content into sections
  const { sections } = processMarkdown(textContent);
  if (sections.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, message: 'No sections produced' }),
      { status: 200 },
    );
  }

  // Generate embeddings for all sections
  const embeddings = await generateEmbeddings(
    ai,
    sections.map((s) => s.content),
  );

  // Insert sections with embeddings
  const sectionRows = sections.map((s, i) => ({
    datasource_id: record.id,
    organization_id: record.organization_id,
    content: s.content,
    heading: s.heading ?? null,
    embedding: serializeEmbedding(embeddings[i]),
  }));

  const { error } = await supabase.from('section').insert(sectionRows as never);
  if (error) {
    console.error('Failed to insert sections:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to store sections' }),
      { status: 500 },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, sections: sections.length }),
    { status: 200 },
  );
}
