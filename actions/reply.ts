import { createServerClient } from '@/lib/supabase/server';

export async function getReply(threadId: string) {
  const supabase = await createServerClient();
  return await supabase
    .from('reply')
    .select()
    .is('is_perfect', null)
    .match({ thread_id: threadId })
    .limit(1)
    .single();
}
