'use client';

import React, { useEffect, useReducer, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getThreads } from '@/actions/email';
import { Tables } from '@/database.types';
import { RealtimeChannel } from '@supabase/supabase-js';

import { CheckIcon, ClipboardCopyIcon } from '@radix-ui/react-icons';

import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Email } from './Email';
import { EmailSkeleton } from './EmailSkeleton';

interface Props {
  orgId: string;
  name: string;
  slug: string;
  inboundEmail: string;
}

type ThreadState = {
  data: Tables<'thread'>[];
  isLoading: boolean;
  status: 'open' | 'closed' | undefined;
};

type ThreadAction =
  | { type: 'FETCH_START' }
  | {
      type: 'FETCH_SUCCESS';
      data: Tables<'thread'>[];
      status: 'open' | 'closed';
    }
  | { type: 'INSERT_THREAD'; thread: Tables<'thread'> };

function threadReducer(state: ThreadState, action: ThreadAction): ThreadState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true };
    case 'FETCH_SUCCESS':
      return { data: action.data, status: action.status, isLoading: false };
    case 'INSERT_THREAD':
      return { ...state, data: [action.thread, ...state.data] };
  }
}

export function EmailsList({ orgId, name, slug, inboundEmail }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { copied, copyToClipboard } = useCopyToClipboard();

  const [state, dispatch] = useReducer(threadReducer, {
    data: [],
    isLoading: true,
    status: undefined,
  });

  useEffect(() => {
    const newStatus =
      searchParams.get('status') === 'closed' ? 'closed' : 'open';
    if (!orgId || state.status === newStatus) return;

    const fetchThreads = async () => {
      dispatch({ type: 'FETCH_START' });
      const { data: threads } = await getThreads(orgId, newStatus);
      dispatch({
        type: 'FETCH_SUCCESS',
        data: threads ?? [],
        status: newStatus,
      });
    };

    fetchThreads();
  }, [orgId, searchParams, state.status]);

  useEffect(() => {
    if (!orgId || channelRef.current) return;

    const supabase = createBrowserClient();
    channelRef.current = supabase
      .channel('thread')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'thread',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          if (state.status === 'closed') return;
          dispatch({
            type: 'INSERT_THREAD',
            thread: payload.new as Tables<'thread'>,
          });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [orgId, state.status]);

  return (
    <div className="max-h-dvh">
      <div className="flex h-[60px] items-center justify-between border-b p-4">
        <h3 className="font-semibold">{name}</h3>
        <Select
          value={searchParams.get('status') ?? 'open'}
          onValueChange={(value) => router.push(`?status=${value}`)}
        >
          <SelectTrigger className="w-[120px] shadow-none">
            <SelectValue placeholder="Open" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex h-[calc(100dvh-60px)] flex-col overflow-auto">
        {state.isLoading ? (
          Array.from({ length: 10 }).map((_, index) => (
            <EmailSkeleton key={`skeleton-${index}`} />
          ))
        ) : state.data.length > 0 ? (
          state.data.map((e) => <Email key={e.id} slug={slug} {...e} />)
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-4 p-4 text-center">
            <h1 className="text-xl font-bold tracking-tight">
              No emails yet
            </h1>
            <p className="text-foreground text-sm">
              Forward your support emails to the address below to get started.
            </p>
            {inboundEmail && (
              <div className="bg-bg flex w-full items-center justify-between gap-2 rounded-base border-2 border-black px-3 py-2 shadow-base">
                <span className="truncate text-xs font-medium">
                  {inboundEmail}
                </span>
                <button
                  onClick={() => copyToClipboard(inboundEmail)}
                  className="shrink-0 text-black transition-opacity hover:opacity-70"
                  aria-label="Copy inbound email"
                >
                  {copied ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <ClipboardCopyIcon className="size-4" />
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
