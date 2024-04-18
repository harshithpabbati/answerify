'use server';

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
