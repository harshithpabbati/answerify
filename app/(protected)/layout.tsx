import React from 'react';
import { redirect } from 'next/navigation';
import { getUser } from '@/actions/auth';
import { getOrganizations } from '@/actions/organization';

import { Organizations, User } from '@/components/sidebar';

export default async function ProtectedLayout({
  children,
}: React.PropsWithChildren<{}>) {
  const {
    data: { user },
  } = await getUser();
  if (!user?.id) return redirect('/auth/sign-in');

  const organizations = await getOrganizations();

  return (
    <div className="flex h-dvh">
      <div className="bg-background relative flex h-full w-16 flex-col items-center justify-between border-r">
        <Organizations organizations={organizations} />
        <User user={user} />
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
