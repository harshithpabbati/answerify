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

export async function sendEmail(threadId: string, content: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('thread')
    .select()
    .match({ id: threadId })
    .single();
  if (error || !data?.id) return { data: null, error };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data: resendData } = await resend.emails.send({
    from: 'Support <support@answerify.app>',
    to: [data.email_from],
    subject: data.subject,
    text: content,
    headers: {
      'In-Reply-To': data.message_id,
    },
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
  return { data: emailData, error: emailError };
}
