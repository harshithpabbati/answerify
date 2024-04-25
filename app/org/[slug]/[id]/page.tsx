import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEmails, getThread } from '@/actions/email';
import { getReply } from '@/actions/reply';

import {
  ConversationHeader,
  Conversations,
} from '@/components/organization/conversation';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data, error } = await getThread(params.id);
  return {
    title: error ? 'Not found' : data?.subject,
  };
}

export default async function EmailPage({ params: { id } }: Props) {
  const { data: thread, error: threadError } = await getThread(id);
  if (threadError || !thread?.id) return notFound();

  const [{ data }, { data: replyData }] = await Promise.all([
    getEmails(id),
    getReply(id),
  ]);

  return (
    <div className="max-h-dvh overflow-hidden">
      <ConversationHeader {...thread} />
      <Conversations
        threadId={thread.id}
        conversations={data ?? []}
        reply={replyData ?? null}
        status={thread.status}
      />
    </div>
  );
}
