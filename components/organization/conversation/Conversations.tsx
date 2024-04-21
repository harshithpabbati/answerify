'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { sendEmail } from '@/actions/email';
import { Tables } from '@/database.types';

import { useTiptap } from '@/hooks/useTiptap';
import { Button } from '@/components/ui/button';
import { Tiptap } from '@/components/ui/tiptap';

import { Conversation } from './Conversation';

interface Props {
  threadId: string;
  conversations: Tables<'email'>[];
  reply: Tables<'reply'> | null;
}

export function Conversations({ threadId, conversations, reply }: Props) {
  const router = useRouter();
  const divRef = useRef<HTMLDivElement>(null);

  const editor = useTiptap(reply?.content);

  useEffect(() => {
    if (!divRef.current) return;
    divRef.current.scrollTop = divRef.current.scrollHeight;
  }, []);

  const handleSubmit = () => {
    if (!editor) return;
    sendEmail(threadId, editor?.getHTML(), reply?.id);
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
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSubmit} size="lg">
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
