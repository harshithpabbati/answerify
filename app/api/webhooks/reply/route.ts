import { codeBlock } from 'common-tags';
import OpenAI from 'openai';

import { createServiceClient } from '@/lib/supabase/service';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY!,
});

export async function POST(request: Request) {
  const { record } = await request.json();

  if (record.role !== 'user') {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
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

  const docs =
    documents && documents.length > 0
      ? documents.map(({ content }) => content).join('\n\n')
      : 'No documents found';

  const completionMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    [
      {
        role: 'system',
        content: codeBlock`
          You're an AI assistant who answers questions about documents.

          You're a chat bot, so keep your replies succinct.

          You're only allowed to use the documents below to answer the question.

          If the question isn't related to these documents, say:
          "Sorry, I couldn't find any information on that."

          If the information isn't available in the below documents, say:
          "Sorry, I couldn't find any information on that."

          Do not go off topic.

          Documents:
          ${docs}

          Reply back in HTML.
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

  if (!choices?.[0].message?.content) {
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
      content: choices?.[0].message?.content,
    })
    .select()
    .single();

  return new Response(JSON.stringify({ data, error }), { status: 200 });
}
