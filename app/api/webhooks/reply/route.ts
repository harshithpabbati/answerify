import { codeBlock } from 'common-tags';
import OpenAI from 'openai';

import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY!,
});

export async function POST(request: Request) {
  const { record } = await request.json();

  if (record.role !== 'user') {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: record.cleaned_body,
  });

  if (!response?.data?.[0]?.embedding) {
    return new Response(
      JSON.stringify({ error: 'Not able to create embedding for the input' }),
      { status: 500 }
    );
  }

  const supabase = await createServiceClient();
  const { data: documents, error: matchError } = await supabase
    .rpc('match_sections', {
      embedding: response.data[0].embedding as any,
      match_threshold: 0.8,
      organization_id: record.organization_id,
    })
    .select('content')
    .limit(5);

  if (matchError) {
    console.error(matchError);

    return new Response(
      JSON.stringify({
        error: 'There was an error reading your documents, please try again.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (documents && documents.length === 0) {
    return new Response(
      JSON.stringify({
        error: 'We can not find documents related to the question',
      }),
      { status: 500 }
    );
  }

  const docs = documents.map(({ content }) => content).join('\n\n');

  const completionMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    [
      {
        role: 'system',
        content: codeBlock`
          You're an AI assistant who answers questions about documents.

          You're a chat bot, so keep your replies succinct.

          You're only allowed to use the documents below to answer the question.

          If the question isn't related to these documents, say:
          "NO_INFORMATION"

          If the information isn't available in the below documents, say:
          "NO_INFORMATION"

          Do not go off topic.

          Documents:
          ${docs}

          Reply back in HTML and nothing else.
        `,
      },
      {
        role: 'user',
        content: record.cleaned_body,
      },
    ];

  const { choices } = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: completionMessages,
    max_tokens: 1024,
    temperature: 0,
  });

  if (
    !choices?.[0].message?.content ||
    choices?.[0].message?.content === 'NO_INFORMATION'
  ) {
    return new Response(
      JSON.stringify({ error: 'Response is not available' }),
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from('reply')
    .insert({
      organization_id: record.organization_id,
      thread_id: record.thread_id,
      content: choices?.[0].message?.content.replace(
        /^```html\s*|\s*```$/g,
        ''
      ),
    })
    .select()
    .single();

  return new Response(JSON.stringify({ data, error }), { status: 200 });
}
