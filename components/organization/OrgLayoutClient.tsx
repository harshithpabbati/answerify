'use client';

import { useParams, usePathname } from 'next/navigation';

interface Props {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function OrgLayoutClient({ sidebar, children }: Props) {
  const params = useParams<{ id?: string }>();
  const pathname = usePathname();
  // On the dashboard index, mobile shows the sidebar (thread list).
  // On a conversation or the workflows page, mobile shows the content.
  const hasContent = !!params.id || pathname.includes('/workflows');

  return (
    <div className="flex size-full max-w-dvw max-h-dvh overflow-hidden">
      <div
        className={hasContent ? 'hidden md:flex' : 'flex w-full md:w-auto'}
      >
        {sidebar}
      </div>
      <div className={hasContent ? 'flex-1' : 'hidden flex-1 md:block'}>
        {children}
      </div>
    </div>
  );
}
