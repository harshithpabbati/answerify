import { processMarkdown } from '@/lib/processMarkdown';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: Request) {
  const { record } = await request.json();

  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: record.url }),
  };

  try {
    const response = await fetch(
      'https://api.firecrawl.dev/v0/scrape',
      options
    );
    const data = await response.json();

    if (data?.success) {
      const supabase = await createServiceClient();
      await supabase
        .from('datasource')
        .update({ content: data.data.markdown, metadata: data.data.metadata })
        .match({ id: record.id });

      const { sections } = processMarkdown(data.data.markdown);
      const document_sections = sections.map(({ content }) => ({
        datasource_id: record.id,
        organization_id: record.organization_id,
        content,
      }));
      await supabase
        .from('section')
        .delete()
        .match({ datasource_id: record.id });
      await supabase.from('section').insert(document_sections);
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ err }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
