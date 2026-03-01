import { GoogleGenAI } from '@google/genai';
import { JSDOM } from 'jsdom';

import { generateEmbeddings } from '@/lib/embeddings';
import { processMarkdown } from '@/lib/processMarkdown';
import { createServiceClient } from '@/lib/supabase/service';

function getGenAIClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

/**
 * Webhook triggered when a new datasource row is inserted.
 *
 * 1. Fetches the URL content
 * 2. Converts HTML → plain text
 * 3. Chunks with processMarkdown
 * 4. Generates embeddings via Gemini
 * 5. Inserts sections into the `section` table
 *
 * This pre-indexes datasource content so the reply pipeline can use fast
 * vector search (Agentic RAG) instead of sending every URL to Gemini's
 * URL context tool.
 */
export async function POST(request: Request) {
  const { record } = await request.json();
  const supabase = await createServiceClient();
  const ai = getGenAIClient();

  // Fetch the URL content
  let html: string;
  try {
    const response = await fetch(record.url, {
      headers: { 'User-Agent': 'Answerify/1.0 (knowledge-base indexer)' },
    });
    html = await response.text();
  } catch (error) {
    console.error('Failed to fetch datasource URL:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch URL' }), {
      status: 500,
    });
  }

  const dom = new JSDOM(html);
  const textContent = dom.window.document.body?.textContent?.trim() ?? '';

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
    embedding: `[${embeddings[i].join(',')}]`,
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
