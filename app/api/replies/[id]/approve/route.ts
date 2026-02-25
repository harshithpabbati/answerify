import { Resend } from 'resend';

import { createServiceClient } from '@/lib/supabase/service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content } = await request.json();

  const supabase = await createServiceClient();

  const { data: reply, error: replyError } = await supabase
    .from('reply')
    .select('*, thread:thread_id(email_from, subject, message_id, organization_id)')
    .eq('id', id)
    .single();

  if (replyError || !reply) {
    return new Response(JSON.stringify({ error: 'Reply not found' }), {
      status: 404,
    });
  }

  const thread = reply.thread as any;
  const finalContent = content ?? reply.content;

  // Store edit log if content was modified
  if (content && content !== reply.content) {
    await supabase.from('reply_edit').insert({
      reply_id: reply.id,
      organization_id: reply.organization_id,
      original_content: reply.content,
      final_content: content,
    });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data: resendData } = await resend.emails.send({
    from: 'Support <support@answerify.app>',
    to: [thread.email_from],
    subject: thread.subject,
    html: finalContent,
    headers: { 'In-Reply-To': thread.message_id },
  });

  if (!resendData?.id) {
    await supabase
      .from('reply')
      .update({ status: 'failed' })
      .eq('id', reply.id);
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
    });
  }

  const { data, error } = await supabase
    .from('reply')
    .update({
      status: 'sent',
      content: finalContent,
      sent_at: new Date().toISOString(),
      sent_via: 'resend',
    })
    .eq('id', reply.id)
    .select()
    .single();

  // Auto-learn from this reply in the background
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  fetch(`${baseUrl}/api/replies/${reply.id}/learn`, { method: 'POST' }).catch(
    () => {}
  );

  return new Response(JSON.stringify({ data, error }), { status: 200 });
}
