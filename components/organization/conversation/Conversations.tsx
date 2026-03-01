'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { sendEmail } from '@/actions/email';
import { Tables } from '@/database.types';
import { RealtimeChannel } from '@supabase/supabase-js';

import { useTiptap } from '@/hooks/useTiptap';
import { createBrowserClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { Conversation } from './Conversation';

// Dynamically import Tiptap to reduce initial bundle size
const Tiptap = dynamic(
  () =>
    import('@/components/ui/tiptap').then((mod) => ({ default: mod.Tiptap })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-base mt-4 h-40 animate-pulse border" />
    ),
  }
);

interface Props {
  threadId: string;
  conversations: Tables<'email'>[];
  reply: Tables<'reply'> | null;
  status: string;
}

function confidenceLabel(score: number): string {
  if (score >= 0.85) return 'High';
  if (score >= 0.65) return 'Medium';
  if (score > 0) return 'Low';
  return 'None';
}

function confidenceVariant(score: number): 'default' | 'neutral' {
  if (score >= 0.65) return 'default';
  return 'neutral';
}

export function Conversations({
  threadId,
  conversations: initialConversations,
  reply,
  status,
}: Props) {
  const router = useRouter();
  const divRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [conversations, setConversations] = useState(initialConversations);

  const editor = useTiptap(
    conversations[conversations.length - 1].role === 'user'
      ? reply?.content
      : ''
  );

  useEffect(() => {
    if (!divRef.current) return;
    divRef.current.scrollTop = divRef.current.scrollHeight;
  }, [conversations]);

  useEffect(() => {
    if (channelRef.current) return;

    const supabase = createBrowserClient();
    channelRef.current = supabase
      .channel(`email:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newEmail = payload.new as Tables<'email'>;
          setConversations((prev) =>
            prev.some((e) => e.id === newEmail.id) ? prev : [...prev, newEmail]
          );
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        const channel = channelRef.current;
        channelRef.current = null;
        channel.unsubscribe();
      }
    };
  }, [threadId]);

  const handleSubmit = async (
    status: 'open' | 'closed' | undefined = undefined
  ) => {
    if (!editor || !reply?.id) return;
    const content = editor.getHTML();
    await fetch(`/api/replies/${reply.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    sendEmail(threadId, {
      content: editor?.getHTML(),
      replyId: reply?.id,
      status,
    });
    editor.commands.setContent('');
    router.refresh();
  };

  const confidenceScore = reply?.confidence_score ?? 0;

  return (
    <div className="flex h-[calc(100dvh-60px)] flex-col items-start justify-between">
      <div
        ref={divRef}
        className="flex size-full flex-col gap-4 overflow-scroll p-4"
      >
        {conversations.map((c) => (
          <Conversation key={c.id} {...c} />
        ))}
      </div>

      <div className="bg-background border-b border-[#FF4500]/20 w-full border-t p-4">
        {reply && (
          <div className="mb-2 flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              AI confidence:
            </span>
            <Badge
              variant={confidenceVariant(confidenceScore)}
              className="text-xs"
            >
              {confidenceLabel(confidenceScore)}{' '}
              {confidenceScore > 0
                ? `(${Math.round(confidenceScore * 100)}%)`
                : ''}
            </Badge>
            {reply.status === 'sent' && (
              <Badge variant="default" className="text-xs">
                Auto-sent
              </Badge>
            )}
          </div>
        )}
        <Tiptap editor={editor} />
        <div className="mt-2 md:mt-4 flex flex-col md:flex-row flex-wrap justify-end gap-2">
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
