'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { sendEmail } from '@/actions/email';
import { Tables } from '@/database.types';

import { useTiptap } from '@/hooks/useTiptap';
import { Button } from '@/components/ui/button';

import { Conversation } from './Conversation';

// Dynamically import Tiptap to reduce initial bundle size
const Tiptap = dynamic(
  () =>
    import('@/components/ui/tiptap').then((mod) => ({ default: mod.Tiptap })),
  {
    ssr: false,
    loading: () => (
      <div className="mt-4 h-40 rounded-base animate-pulse border" />
    ),
  }
);

interface Props {
  threadId: string;
  conversations: Tables<'email'>[];
  reply: Tables<'reply'> | null;
  status: string;
}

export function Conversations({
  threadId,
  conversations,
  reply,
  status,
}: Props) {
  const router = useRouter();
  const divRef = useRef<HTMLDivElement>(null);

  const editor = useTiptap(
    conversations[conversations.length - 1].role === 'user'
      ? reply?.content
      : ''
  );

  useEffect(() => {
    if (!divRef.current) return;
    divRef.current.scrollTop = divRef.current.scrollHeight;
  }, []);

  const handleSubmit = (status: 'open' | 'closed' | undefined = undefined) => {
    if (!editor) return;
    sendEmail(threadId, {
      content: editor?.getHTML(),
      replyId: reply?.id,
      status,
    });
    editor.commands.setContent('');
    router.refresh();
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col items-start justify-between">
      <div
        ref={divRef}
        className="flex size-full flex-col gap-4 overflow-scroll p-4"
      >
        {conversations.map((c) => (
          <Conversation key={c.id} {...c} />
        ))}
      </div>
      <div className="bg-background w-full border-t p-4">
        <Tiptap editor={editor} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="neutral" onClick={() => handleSubmit()} size="lg">
            Submit
          </Button>
          <Button
            onClick={() =>
              handleSubmit(status === 'closed' ? 'open' : 'closed')
            }
            size="lg"
          >
            {status === 'closed'
              ? 'Submit & re-open ticket'
              : 'Submit & close ticket'}
          </Button>
        </div>
      </div>
    </div>
  );
}
