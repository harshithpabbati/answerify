'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Link } from 'next-view-transitions';

import { cn } from '@/lib/utils';
import { HumanizedTime } from '@/components/ui/humanized-time';

const TAG_COLORS: Record<string, string> = {
  Billing:
    'border-blue-500/40 bg-blue-500/10 text-blue-400',
  'Bug Report':
    'border-red-500/40 bg-red-500/10 text-red-400',
  'Feature Request':
    'border-purple-500/40 bg-purple-500/10 text-purple-400',
  'General Support':
    'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  escalated:
    'border-[#FF4500]/40 bg-[#FF4500]/10 text-[#FF4500]',
};

function tagClass(tag: string): string {
  return (
    TAG_COLORS[tag] ??
    'border-muted-foreground/30 bg-muted text-muted-foreground'
  );
}

interface Props {
  id: string;
  slug: string;
  email_from: string;
  subject: string;
  created_at: string;
  tags?: string[] | null;
}

export function Email({ id, slug, email_from, subject, created_at, tags }: Props) {
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
        {tags && tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  'inline-flex items-center border px-1.5 py-px font-mono text-[10px] font-medium uppercase tracking-wider',
                  tagClass(tag)
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

