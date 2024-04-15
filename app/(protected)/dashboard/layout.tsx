import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getIsUserAuthenticated } from '@/actions/auth';
import { IconJarLogoIcon } from '@radix-ui/react-icons';

import { User } from '@/components/sidebar/User';

export default async function ProtectedLayout({
  children,
}: React.PropsWithChildren<{}>) {
  const isUserAuthenticated = await getIsUserAuthenticated();
  if (!isUserAuthenticated) return redirect('/auth/sign-in');

  return (
    <div className="flex h-dvh">
      <div className="bg-background relative flex h-full w-16 flex-col items-center justify-between border-r">
        <Link className="border-b p-3" href={{ pathname: '/dashboard' }}>
          <IconJarLogoIcon className="size-6" />
        </Link>
        <div className="p-3"></div>
        <div className="border-t p-2">
          <User />
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
