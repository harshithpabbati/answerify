import Link from 'next/link';
import { ArrowLeftIcon } from '@radix-ui/react-icons';

import { Badge } from '@/components/ui/badge';

interface Props {
  subject: string;
  email_from: string;
  status: string;
  slug: string;
}

export function ConversationHeader({ subject, email_from, status, slug }: Props) {
  return (
    <div className="bg-background flex h-[60px] items-center justify-between border-b px-4 py-2">
      <div className="flex items-center gap-2">
        <Link
          href={`/org/${slug}`}
          className="md:hidden rounded p-1 hover:opacity-70"
          aria-label="Back to inbox"
        >
          <ArrowLeftIcon className="size-5" />
        </Link>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-foreground font-semibold">{subject}</h3>
          <span className="text-foreground text-xs">{email_from}</span>
        </div>
      </div>
      {status === 'closed' && <Badge className="px-2 py-1">Closed</Badge>}
    </div>
  );
}
