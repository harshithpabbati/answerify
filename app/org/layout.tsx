import React from 'react';
import { getUser } from '@/actions/auth';
import { getOrganizations } from '@/actions/organization';

import { CreateOrganization, Organizations, User } from '@/components/sidebar';

export default async function OrgLayout({
  children,
}: React.PropsWithChildren<{}>) {
  const {
    data: { user },
  } = await getUser();
  if (!user?.id) return null;

  const organizations = await getOrganizations();

  return (
    <div className="max-w-dvw flex h-dvh max-h-dvh w-dvw">
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
