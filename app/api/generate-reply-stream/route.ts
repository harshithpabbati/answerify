import { GoogleGenAI } from '@google/genai';
import { codeBlock } from 'common-tags';

import { createServiceClient } from '@/lib/supabase/service';

type Citation = {
  title: string;
  url: string;
  datasource_id: string;
  snippet?: string;
};

export async function POST(request: Request) {
  const { emailId, threadId } = await request.json();

  const supabase = await createServiceClient();
  const { data: record, error: emailError } = await supabase
    .from('email')
    .select()
    .eq('id', emailId)
    .single();

  if (emailError || !record) {
    return new Response(JSON.stringify({ error: 'Email not found' }), {
      status: 404,
    });
  }

  if (!record.cleaned_body) {
    return new Response(JSON.stringify({ error: 'Email has no content' }), {
      status: 400,
    });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const embeddingResult = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: record.cleaned_body,
    config: {
      outputDimensionality: 1536,
      taskType: 'RETRIEVAL_QUERY',
    },
  });
  const embedding = embeddingResult.embeddings?.[0]?.values;

  if (!embedding?.length) {
    return new Response(
      JSON.stringify({ error: 'Failed to create embedding' }),
      { status: 500 }
    );
  }

  const { data: sections } = await supabase
    .rpc('match_sections', {
      embedding: embedding as any,
      match_threshold: 0.6,
      organization_id: record.organization_id,
      match_count: 5,
    })
    .select('id, content, datasource_id, similarity');

  const { data: threadEmails } = await supabase
    .from('email')
    .select('role, cleaned_body, created_at')
    .eq('thread_id', threadId)
    .neq('id', emailId)
    .order('created_at', { ascending: true })
    .limit(10);

  const encoder = new TextEncoder();

  if (!sections || sections.length === 0) {
    const fallback = `<p>Thank you for reaching out. I wasn't able to find specific information to fully answer your question at this time. Could you please provide more details or clarify your request so we can assist you better?</p>`;
    return new Response(
      encoder.encode(
        `data: ${JSON.stringify({ text: fallback })}\n\ndata: [DONE]\n\n`
      ),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    );
  }

  const datasourceIds = [
    ...new Set(sections.map((s: any) => s.datasource_id)),
  ] as string[];

  const { data: datasources } = await supabase
    .from('datasource')
    .select('id, title, url')
    .in('id', datasourceIds);

  const datasourceMap = new Map(
    (datasources ?? []).map((d) => [d.id, { title: d.title, url: d.url }])
  );

  const citations: Citation[] = sections
    .map((s: any) => {
      const ds = datasourceMap.get(s.datasource_id);
      return {
        datasource_id: s.datasource_id,
        title: ds?.title ?? ds?.url ?? 'Source',
        url: ds?.url ?? '',
        snippet: s.content.slice(0, 200),
      };
    })
    .filter(
      (c: Citation, idx: number, arr: Citation[]) =>
        arr.findIndex((x) => x.datasource_id === c.datasource_id) === idx
    );

  const docs = sections.map((s: any) => s.content).join('\n\n');

  const conversationHistory =
    threadEmails && threadEmails.length > 0
      ? threadEmails
          .map((e) => {
            const label =
              e.role === 'user'
                ? 'Customer'
                : e.role === 'support'
                  ? 'Support'
                  : e.role;
            return `${label}: ${e.cleaned_body}`;
          })
          .join('\n\n')
      : '';

  const systemPrompt = codeBlock`
    You're an AI assistant who answers customer support questions about documents.

    You're a chat bot, so keep your replies clear & organized.

    You're only allowed to use the documents below to answer the question.

    If the question isn't related to these documents, say:
    "NO_INFORMATION"

    If the information isn't available in the below documents, say:
    "NO_INFORMATION"

    Do not go off topic.

    Documents:
    ${docs}

    ${conversationHistory ? `Previous conversation:\n${conversationHistory}\n` : ''}
    Reply back in HTML and nothing else, avoid using markdown, and
    format the response accordingly. Also avoid signature at the end of the reply.
  `;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await ai.models.generateContentStream({
          model: 'gemini-2.0-flash',
          contents: record.cleaned_body as string,
          config: {
            systemInstruction: systemPrompt,
            maxOutputTokens: 1024,
            temperature: 0.3,
          },
        });

        for await (const chunk of result) {
          const text = chunk.text;
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          }
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ citations })}\n\n`)
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
