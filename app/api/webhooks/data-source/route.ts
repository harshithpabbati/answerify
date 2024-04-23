import { processMarkdown } from '@/lib/processMarkdown';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'edge';

const scrapeURL = async (record: any) => {
  if (record.content)
    return { success: true, markdown: record.content, metadata: null };
  else {
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
      return data;
    } catch (e) {
      throw e;
    }
  }
};

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const { record } = await request.json();

  try {
    const data = await scrapeURL(record);
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

      const { data: records, error } = await supabase
        .from('section')
        .insert(document_sections);

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to insert sections' }),
          { status: 500 }
        );
      }

      await fetch(`${origin}/api/webhooks/embedding`, { method: 'POST' });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ err }), { status: 500 });
  }
}
