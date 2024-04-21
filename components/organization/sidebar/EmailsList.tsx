'use client';

import React, { useEffect, useRef, useState } from 'react';
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

export function EmailsList({ orgId, name, slug }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [data, setData] = useState<Tables<'thread'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'open' | 'closed' | undefined>(
    undefined
  );

  useEffect(() => {
    const newStatus =
      searchParams.get('status') === 'closed' ? 'closed' : 'open';
    if (!orgId || status === newStatus) return;

    const fetchThreads = async () => {
      setIsLoading(true);
      const { data: threads } = await getThreads(orgId, newStatus);
      setData(threads ?? []);
      setStatus(newStatus);
      setIsLoading(false);
    };

    fetchThreads();
  }, [orgId, searchParams, status]);

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
          if (status === 'closed') return;
          setData((t) => [payload.new as Tables<'thread'>, ...t]);
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [orgId, status]);

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
        {isLoading
          ? Array.from({ length: 10 }).map((_, index) => (
              <EmailSkeleton key={index} />
            ))
          : data.map((e) => <Email key={e.id} slug={slug} {...e} />)}
      </div>
    </div>
  );
}
