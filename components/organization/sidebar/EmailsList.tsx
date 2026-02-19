'use client';

import React, { useEffect, useReducer, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getThreads } from '@/actions/email';
import { Tables } from '@/database.types';
import { RealtimeChannel } from '@supabase/supabase-js';

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
}

type ThreadState = {
  data: Tables<'thread'>[];
  isLoading: boolean;
  status: 'open' | 'closed' | undefined;
};

type ThreadAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; data: Tables<'thread'>[]; status: 'open' | 'closed' }
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

export function EmailsList({ orgId, name, slug }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const channelRef = useRef<RealtimeChannel | null>(null);

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
      dispatch({ type: 'FETCH_SUCCESS', data: threads ?? [], status: newStatus });
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
          dispatch({ type: 'INSERT_THREAD', thread: payload.new as Tables<'thread'> });
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
              We can&apos;t find any emails
            </h1>
            <p className="text-foreground">
              Emails will be listed here once you receive any email, also please
              check if your forwarding is set correctly if emails are not listed
              here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
