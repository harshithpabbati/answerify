'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendEmail } from '@/actions/email';
import { Tables } from '@/database.types';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { Conversation } from './Conversation';

interface Props {
  threadId: string;
  conversations: Tables<'email'>[];
}

export function Conversations({ threadId, conversations }: Props) {
  const router = useRouter();
  const divRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<string>('');

  useEffect(() => {
    if (!divRef.current) return;
    // scroll to bottom on load
    divRef.current.scrollTop = divRef.current.scrollHeight;
  }, []);

  const handleSubmit = () => {
    sendEmail(threadId, content);
    setContent('');
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
        <Textarea
          className="mt-4"
          placeholder="Enter your message here"
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus
        />
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSubmit} size="lg">
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
