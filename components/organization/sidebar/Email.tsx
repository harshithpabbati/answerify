'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';

import { getNameInitials } from '@/lib/gravatar';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { HumanizedTime } from '@/components/ui/humanized-time';

interface Props {
  id: string;
  slug: string;
  email_from: string;
  email_from_name: string;
  subject: string;
  created_at: string;
}

export function Email({
  id,
  slug,
  email_from,
  email_from_name,
  subject,
  created_at,
}: Props) {
  const params = useParams();
  const searchParams = useSearchParams();
  return (
    <Link
      href={`/org/${slug}/${id}?${searchParams.toString()}`}
      className={cn(
        'hover:bg-muted flex items-center gap-2 border-b px-2 py-3',
        params.id === id ? 'bg-muted' : 'bg-background'
      )}
    >
      <Avatar className="size-10 border">
        <AvatarFallback
          className={params.id === id ? 'bg-background' : 'bg-muted'}
        >
          {getNameInitials(email_from_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex size-full flex-col gap-0.5 overflow-auto">
        <h3 className="truncate text-sm font-medium">{subject}</h3>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">{email_from}</p>
          <HumanizedTime time={created_at} />
        </div>
      </div>
    </Link>
  );
}
