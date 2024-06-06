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
        'hover:bg-bg border-b px-4 py-3',
        params.id === id ? 'bg-bg' : 'bg-background'
      )}
    >
      <div className="flex size-full flex-col gap-0.5 overflow-auto">
        <h3 className="text-foreground truncate text-sm font-medium">
          {subject}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-foreground text-xs">{email_from}</span>
          <HumanizedTime time={created_at} />
        </div>
      </div>
    </Link>
  );
}
