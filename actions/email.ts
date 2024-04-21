'use server';

import { Resend } from 'resend';

import { createServerClient } from '@/lib/supabase/server';

export async function getThreads(orgId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('thread')
    .select()
    .match({ organization_id: orgId })
    .order('last_message_created_at', { ascending: false });
  return { data, error };
}

export async function getThread(id: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('thread')
    .select()
    .match({ id })
    .single();
  return { data, error };
}

export async function getEmails(threadId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('email')
    .select()
    .match({ thread_id: threadId })
    .order('created_at', { ascending: true });
  return { data, error };
}

export async function updateReplyStatus(replyId: string, content: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('reply')
    .select('content')
    .match({ id: replyId })
    .single();

  if (error) return { data: null, error };

  return await supabase
    .from('reply')
    .update({ is_perfect: data.content === content })
    .match({ id: replyId });
}

export async function sendEmailWithResend({
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
    headers: {
      'In-Reply-To': messageId,
    },
  });
  return data;
}

export async function sendEmail(
  threadId: string,
  content: string,
  replyId?: string
) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('thread')
    .select()
    .match({ id: threadId })
    .single();
  if (error || !data?.id) return { data: null, error };

  const resendData = await sendEmailWithResend({
    to: data.email_from,
    subject: data.subject,
    content,
    messageId: data.message_id,
  });
  if (!resendData?.id) return;

  const { data: emailData, error: emailError } = await supabase
    .from('email')
    .insert({
      organization_id: data.organization_id,
      thread_id: threadId,
      body: content,
      role: 'staff',
      email_from: 'support@answerify.app',
      email_from_name: 'Support',
    })
    .select()
    .single();

  if (replyId) updateReplyStatus(replyId, content);
  return { data: emailData, error: emailError };
}
