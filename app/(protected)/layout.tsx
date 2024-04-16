import React from 'react';
import { redirect } from 'next/navigation';
import { getIsUserAuthenticated } from '@/actions/auth';

import { Organizations, User } from '@/components/sidebar';

export default async function ProtectedLayout({
  children,
}: React.PropsWithChildren<{}>) {
  const isUserAuthenticated = await getIsUserAuthenticated();
  if (!isUserAuthenticated) return redirect('/auth/sign-in');

  return (
    <div className="flex h-dvh">
      <div className="bg-background relative flex h-full w-16 flex-col items-center justify-between border-r">
        <Organizations />
        <User />
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
