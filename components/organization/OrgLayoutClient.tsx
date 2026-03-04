'use client';

import { useParams, usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

import { MobileNav } from './MobileNav';

interface Props {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function OrgLayoutClient({ sidebar, children }: Props) {
  const params = useParams<{ id?: string }>();
  const pathname = usePathname();
  // Extract the org slug from the pathname: /org/[slug]/...
  const slug = pathname.split('/')[2] ?? '';
  // Full-page routes always show content (not the sidebar) on mobile.
  const isFullPage =
    pathname.includes('/workflows') ||
    pathname.includes('/admin') ||
    pathname.includes('/sandbox');
  // On the dashboard index, mobile shows the sidebar (thread list).
  // On a conversation or a full-page route, mobile shows the content.
  const hasContent = !!params.id || isFullPage;

  return (
    <div className="flex size-full max-h-dvh max-w-dvw overflow-hidden">
      <div className={hasContent ? 'hidden md:flex' : 'flex w-full md:w-auto'}>
        {sidebar}
      </div>
      <div
        className={cn(
          hasContent ? 'flex-1' : 'hidden flex-1 md:block',
          isFullPage && 'pb-16 md:pb-0'
        )}
      >
        {children}
      </div>
      {isFullPage && <MobileNav slug={slug} />}
    </div>
  );
}
