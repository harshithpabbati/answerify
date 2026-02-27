'use client';

import { useParams } from 'next/navigation';

interface Props {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function OrgLayoutClient({ sidebar, children }: Props) {
  const params = useParams<{ id?: string }>();
  const hasConversation = !!params.id;

  return (
    <div className="flex size-full max-w-dvw max-h-dvh overflow-hidden">
      <div
        className={hasConversation ? 'hidden md:flex' : 'flex w-full md:w-auto'}
      >
        {sidebar}
      </div>
      <div className={hasConversation ? 'flex-1' : 'hidden flex-1 md:block'}>
        {children}
      </div>
    </div>
  );
}
