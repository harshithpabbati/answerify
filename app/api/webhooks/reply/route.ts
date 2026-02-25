import { codeBlock } from 'common-tags';
import OpenAI from 'openai';
import { Resend } from 'resend';

import { createServiceClient } from '@/lib/supabase/service';

const AUTOPILOT_CONFIDENCE_THRESHOLD_DEFAULT = 0.65;

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_KEY!,
  });
}

type Citation = {
  title: string;
  url: string;
  datasource_id: string;
  snippet?: string;
};

async function sendReplyViaResend({
  to,
  subject,
  content,
  messageId,
}: {
  to: string;
  subject: string;
  content: string;
  messageId: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data } = await resend.emails.send({
    from: 'Support <support@answerify.app>',
    to: [to],
    subject,
    html: content,
    headers: { 'In-Reply-To': messageId },
  });
  return data;
}

export async function POST(request: Request) {
  const { record } = await request.json();

  if (record.role !== 'user') {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const openai = getOpenAIClient();
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

  // Fetch org settings for autopilot
  const { data: org } = await supabase
    .from('organization')
    .select('autopilot_enabled, autopilot_threshold, support_email')
    .eq('id', record.organization_id)
    .single();

  const autopilotEnabled = org?.autopilot_enabled ?? false;
  const autopilotThreshold =
    org?.autopilot_threshold ?? AUTOPILOT_CONFIDENCE_THRESHOLD_DEFAULT;

  const { data: sections, error: matchError } = await supabase
    .rpc('match_sections', {
      embedding: response.data[0].embedding as any,
      match_threshold: 0.6,
      organization_id: record.organization_id,
    })
    .select('id, content, datasource_id')
    .limit(5);

  if (matchError || !sections || sections.length === 0) {
    // No knowledge base content found – create a draft asking for more info
    const clarifyingContent = `<p>Thank you for reaching out. I wasn't able to find specific information to fully answer your question at this time. Could you please provide more details or clarify your request so we can assist you better?</p>`;
    const { data, error } = await supabase
      .from('reply')
      .insert({
        organization_id: record.organization_id,
        thread_id: record.thread_id,
        content: clarifyingContent,
        status: 'draft',
        confidence_score: 0,
        citations: [],
      })
      .select()
      .single();
    return new Response(JSON.stringify({ data, error }), { status: 200 });
  }

  // Fetch datasource metadata for citations
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

  // Build citations
  const citations: Citation[] = sections.map((s: any) => {
    const ds = datasourceMap.get(s.datasource_id);
    return {
      datasource_id: s.datasource_id,
      title: ds?.title ?? ds?.url ?? 'Source',
      url: ds?.url ?? '',
      snippet: s.content.slice(0, 200),
    };
  });

  // De-duplicate citations by datasource_id
  const uniqueCitations = citations.filter(
    (c, idx, arr) =>
      arr.findIndex((x) => x.datasource_id === c.datasource_id) === idx
  );

  const docs = sections.map((s: any) => s.content).join('\n\n');

  // Build citation footnote HTML
  const citationFootnotes =
    uniqueCitations.length > 0
      ? `<hr/><p style="font-size:0.85em;color:#666;"><strong>Sources:</strong> ${uniqueCitations
          .map(
            (c, i) =>
              `<a href="${c.url}" target="_blank" rel="noopener noreferrer">[${i + 1}] ${c.title}</a>`
          )
          .join(', ')}</p>`
      : '';

  const completionMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    [
      {
        role: 'system',
        content: codeBlock`
          You're an AI assistant who answers questions about documents.

          You're a chat bot, so keep your replies clear & organized.

          You're only allowed to use the documents below to answer the question.

          If the question isn't related to these documents, say:
          "NO_INFORMATION"

          If the information isn't available in the below documents, say:
          "NO_INFORMATION"

          Do not go off topic.

          Documents:
          ${docs}

          Reply back in HTML and nothing else, avoid using markdown, and 
          format the response accordingly. Also avoid signature at the end of the reply.
        `,
      },
      {
        role: 'user',
        content: record.cleaned_body,
      },
    ];

  const { choices } = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: completionMessages,
    max_tokens: 1024,
    temperature: 0.5,
  });

  const rawContent = choices?.[0].message?.content;

  if (!rawContent || rawContent === 'NO_INFORMATION') {
    // Generate clarifying question draft instead of erroring out
    const clarifyingContent = `<p>Thank you for contacting us. Based on the information available, I wasn't able to provide a complete answer to your question. Could you please provide more details or rephrase your question so we can assist you better?</p>`;
    const { data, error } = await supabase
      .from('reply')
      .insert({
        organization_id: record.organization_id,
        thread_id: record.thread_id,
        content: clarifyingContent,
        status: 'draft',
        confidence_score: 0,
        citations: [],
      })
      .select()
      .single();
    return new Response(JSON.stringify({ data, error }), { status: 200 });
  }

  // Compute confidence: heuristic based on number of matching sections found
  const confidence = Math.min(0.6 + sections.length * 0.08, 0.99);

  const htmlContent =
    rawContent.replace(/^```html\s*|\s*```$/g, '') + citationFootnotes;

  // Decide autopilot: send automatically if enabled and above threshold
  const shouldAutoSend = autopilotEnabled && confidence >= autopilotThreshold;

  if (shouldAutoSend) {
    // Fetch thread info to send the email
    const { data: thread } = await supabase
      .from('thread')
      .select('email_from, subject, message_id')
      .eq('id', record.thread_id)
      .single();

    if (thread) {
      try {
        const resendResult = await sendReplyViaResend({
          to: thread.email_from,
          subject: thread.subject,
          content: htmlContent,
          messageId: thread.message_id,
        });

        if (resendResult?.id) {
          const { data, error } = await supabase
            .from('reply')
            .insert({
              organization_id: record.organization_id,
              thread_id: record.thread_id,
              content: htmlContent,
              status: 'sent',
              confidence_score: confidence,
              citations: uniqueCitations,
              sent_at: new Date().toISOString(),
              sent_via: 'resend',
            })
            .select()
            .single();
          return new Response(JSON.stringify({ data, error }), { status: 200 });
        }
      } catch (e) {
        console.error('Autopilot send failed:', e);
        // Fall through to draft
      }
    }
  }

  // Save as draft
  const { data, error } = await supabase
    .from('reply')
    .insert({
      organization_id: record.organization_id,
      thread_id: record.thread_id,
      content: htmlContent,
      status: 'draft',
      confidence_score: confidence,
      citations: uniqueCitations,
    })
    .select()
    .single();

  return new Response(JSON.stringify({ data, error }), { status: 200 });
}

