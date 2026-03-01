'use server';

import { Resend } from 'resend';

import { cleanBody } from '@/lib/cleanBody';
import { createServerClient } from '@/lib/supabase/server';

export async function getOrgStats(orgId: string) {
  const supabase = await createServerClient();
  const [{ count: threadCount }, { count: replyCount }] = await Promise.all([
    supabase
      .from('thread')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId),
    supabase
      .from('reply')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId),
  ]);
  return { threadCount: threadCount ?? 0, replyCount: replyCount ?? 0 };
}

export async function getDetailedOrgStats(orgId: string) {
  const supabase = await createServerClient();

  const STATS_DAY_RANGE = 7;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - (STATS_DAY_RANGE - 1));
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const since = sevenDaysAgo.toISOString();

  const [
    { count: openThreads },
    { count: closedThreads },
    { data: replyRows },
    { data: recentThreads },
    { data: recentReplies },
  ] = await Promise.all([
    supabase
      .from('thread')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'open'),
    supabase
      .from('thread')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'closed'),
    supabase
      .from('reply')
      .select('status, is_perfect')
      .eq('organization_id', orgId),
    supabase
      .from('thread')
      .select('created_at')
      .eq('organization_id', orgId)
      .gte('created_at', since),
    supabase
      .from('reply')
      .select('created_at')
      .eq('organization_id', orgId)
      .gte('created_at', since),
  ]);

  const replyStatusCounts: Record<string, number> = {};
  let perfectCount = 0;
  let editedCount = 0;
  const replies: { status: string; is_perfect: boolean | null }[] =
    replyRows ?? [];
  for (const r of replies) {
    replyStatusCounts[r.status] = (replyStatusCounts[r.status] ?? 0) + 1;
    if (r.is_perfect === true) perfectCount++;
    else if (r.is_perfect === false) editedCount++;
  }

  const dayLabels: string[] = [];
  const threadsByDay: number[] = [];
  const repliesByDay: number[] = [];
  const threads: { created_at: string }[] = recentThreads ?? [];
  const recentRepliesList: { created_at: string }[] = recentReplies ?? [];
  for (let i = 0; i < STATS_DAY_RANGE; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = d.toISOString().slice(0, 10);
    dayLabels.push(label);
    threadsByDay.push(
      threads.filter((t) => t.created_at.slice(0, 10) === dateStr).length
    );
    repliesByDay.push(
      recentRepliesList.filter((r) => r.created_at.slice(0, 10) === dateStr)
        .length
    );
  }

  return {
    openThreads: openThreads ?? 0,
    closedThreads: closedThreads ?? 0,
    totalReplies: replies.length,
    replyStatusCounts,
    perfectCount,
    editedCount,
    dayLabels,
    threadsByDay,
    repliesByDay,
    dayRange: STATS_DAY_RANGE,
  };
}

export async function getThreads(orgId: string, status: 'open' | 'closed') {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('thread')
    .select()
    .match({ organization_id: orgId })
    .filter('status', 'eq', status)
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

  if (error || !data) return { data: null, error };

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
    from: 'Support <support@answerify.dev>',
    to: [to],
    subject,
    html: content,
    headers: {
      'In-Reply-To': messageId,
    },
  });
  return data;
}

export async function updateTicketStatus(
  threadId: string,
  status: 'open' | 'closed'
) {
  const supabase = await createServerClient();
  return await supabase
    .from('thread')
    .update({ status })
    .match({ id: threadId });
}

export async function sendEmail(
  threadId: string,
  {
    content,
    replyId,
    status,
  }: {
    content: string;
    replyId?: string;
    status?: 'open' | 'closed';
  }
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
      cleaned_body: cleanBody(content),
      role: 'staff',
      email_from: 'support@answerify.dev',
      email_from_name: 'Support',
      is_perfect: true,
    })
    .select()
    .single();

  if (replyId) updateReplyStatus(replyId, content);
  if (status) updateTicketStatus(threadId, status);

  return { data: emailData, error: emailError };
}
