'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Tables } from '@/database.types';
import { RealtimeChannel } from '@supabase/supabase-js';

import { createBrowserClient } from '@/lib/supabase/client';

import { Email } from './Email';

interface Props {
  orgId: string;
  name: string;
  slug: string;
  threads: Tables<'thread'>[];
}

export function EmailsList({ orgId, name, slug, threads }: Props) {
  const [data, setData] = useState<Tables<'thread'>[]>(threads);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    setData(threads);
  }, [threads]);

  useEffect(() => {
    if (!orgId) return;

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
          setData((t) => [payload.new as Tables<'thread'>, ...t]);
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [orgId]);

  return (
    <div>
      <div className="border-b p-4">
        <h3 className="font-semibold">{name}</h3>
      </div>
      <div className="flex flex-col">
        {data.map((e) => (
          <Email key={e.id} slug={slug} {...e} />
        ))}
      </div>
    </div>
  );
}
