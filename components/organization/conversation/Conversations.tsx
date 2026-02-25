'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { sendEmail } from '@/actions/email';
import { Tables } from '@/database.types';

import { useTiptap } from '@/hooks/useTiptap';
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

type Citation = {
  title: string;
  url: string;
  datasource_id?: string;
  snippet?: string;
};

interface Props {
  threadId: string;
  conversations: Tables<'email'>[];
  reply: Tables<'reply'> | null;
  status: string;
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  const pct = Math.round(score * 100);
  const color =
    pct >= 80
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : pct >= 65
        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        : 'bg-red-500/20 text-red-400 border-red-500/30';
  return (
    <span
      className={`rounded border px-2 py-0.5 text-xs font-medium ${color}`}
      title="AI confidence score"
    >
      {pct}% confidence
    </span>
  );
}

function CitationsPanel({ citations }: { citations: Citation[] }) {
  if (!citations || citations.length === 0) return null;
  return (
    <div className="bg-muted/50 rounded-base border p-3">
      <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
        Sources
      </p>
      <ul className="flex flex-col gap-1">
        {citations.map((c, i) => (
          <li key={c.datasource_id ?? i} className="flex items-start gap-1.5">
            <span className="text-muted-foreground text-xs">[{i + 1}]</span>
            {c.url ? (
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary truncate text-xs underline"
              >
                {c.title || c.url}
              </a>
            ) : (
              <span className="text-muted-foreground text-xs">
                {c.title || 'Source'}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Conversations({
  threadId,
  conversations,
  reply,
  status,
}: Props) {
  const router = useRouter();
  const divRef = useRef<HTMLDivElement>(null);

  const citations = (reply?.citations as Citation[] | null) ?? [];
  const isDraft = reply?.status === 'draft' || reply?.status === 'approved';
  const isSent = reply?.status === 'sent';

  const editor = useTiptap(
    conversations[conversations.length - 1].role === 'user'
      ? reply?.content
      : ''
  );

  useEffect(() => {
    if (!divRef.current) return;
    divRef.current.scrollTop = divRef.current.scrollHeight;
  }, []);

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
        {/* Autopilot / draft status bar */}
        {reply && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {isSent && (
              <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/20">
                ✓ Auto-sent by Autopilot
              </Badge>
            )}
            {isDraft && (
              <Badge variant="neutral" className="text-muted-foreground">
                Draft – awaiting review
              </Badge>
            )}
            <ConfidenceBadge score={reply.confidence_score ?? null} />
          </div>
        )}

        {/* Citations panel */}
        {citations.length > 0 && (
          <div className="mb-3">
            <CitationsPanel citations={citations} />
          </div>
        )}

        <Tiptap editor={editor} />

        <div className="mt-4 flex flex-wrap justify-end gap-2">
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
