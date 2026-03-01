'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Link } from 'next-view-transitions';

import { cn } from '@/lib/utils';
import { HumanizedTime } from '@/components/ui/humanized-time';

interface Props {
  id: string;
  slug: string;
  email_from: string;
  subject: string;
  created_at: string;
}

export function Email({ id, slug, email_from, subject, created_at }: Props) {
  const params = useParams();
  const searchParams = useSearchParams();
  return (
    <Link
      href={`/org/${slug}/${id}?${searchParams.toString()}`}
      className={cn(
        'border-b border-[#FF4500]/10 px-4 py-3 transition-colors',
        params.id === id ? 'bg-[#FF4500]/10' : 'bg-background hover:bg-[#FF4500]/5'
      )}
    >
      <div className="flex size-full flex-col gap-0.5 overflow-hidden">
        <h3 className="font-mono truncate text-sm font-medium text-foreground">
          {subject}
        </h3>
        <div className="flex min-w-0 items-center justify-between">
          <span className="font-mono truncate text-xs text-muted-foreground">{email_from}</span>
          <HumanizedTime time={created_at} />
        </div>
      </div>
    </Link>
  );
}
