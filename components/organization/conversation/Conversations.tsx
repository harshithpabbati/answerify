'use client';

import { useEffect, useRef } from 'react';
import { Tables } from '@/database.types';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { Conversation } from './Conversation';

interface Props {
  conversations: Tables<'email'>[];
}

export function Conversations({ conversations }: Props) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!divRef.current) return;
    // scroll to bottom on load
    divRef.current.scrollTop = divRef.current.scrollHeight;
  }, []);

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
          autoFocus
        />
        <div className="mt-4 flex justify-end">
          <Button size="lg">Submit</Button>
        </div>
      </div>
    </div>
  );
}
