import Link from 'next/link';
import { ArrowLeftIcon } from '@radix-ui/react-icons';

import { Badge } from '@/components/ui/badge';

interface Props {
  subject: string;
  email_from: string;
  status: string;
  slug: string;
}

export function ConversationHeader({
  subject,
  email_from,
  status,
  slug,
}: Props) {
  return (
    <div className="bg-black flex h-[60px] items-center justify-between border-b border-[#FF4500]/20 px-2 md:px-4 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <Link
          href={`/org/${slug}`}
          className="md:hidden shrink-0 p-1 text-gray-400 hover:text-[#FF4500]"
          aria-label="Back to inbox"
        >
          <ArrowLeftIcon className="size-5" />
        </Link>
        <div className="flex min-w-0 flex-col gap-0.5 max-w-xs md:max-w-none">
          <h3 className="font-mono text-white truncate font-semibold uppercase tracking-wide">{subject}</h3>
          <span className="font-mono text-gray-500 truncate text-xs">{email_from}</span>
        </div>
      </div>
      {status === 'closed' && <Badge className="px-2 py-1">Closed</Badge>}
    </div>
  );
}
