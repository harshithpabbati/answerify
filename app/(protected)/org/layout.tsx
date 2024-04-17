import React from 'react';
import { redirect } from 'next/navigation';
import { getUser } from '@/actions/auth';
import { getOrganizations } from '@/actions/organization';

import { CreateOrganization, Organizations, User } from '@/components/sidebar';

export default async function OrgLayout({
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
        <div className="flex flex-col items-center justify-center gap-2 p-2">
          <CreateOrganization />
          <User user={user} />
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
