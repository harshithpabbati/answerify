import React from 'react';
import { redirect } from 'next/navigation';
import { getIsUserAuthenticated } from '@/actions/auth';

export default async function ProtectedLayout({
  children,
}: React.PropsWithChildren<{}>) {
  const isUserAuthenticated = await getIsUserAuthenticated();
  if (!isUserAuthenticated) return redirect('/auth/sign-in');

  return <>{children}</>;
}
