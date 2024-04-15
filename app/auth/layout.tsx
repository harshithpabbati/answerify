import React from 'react';
import { redirect } from 'next/navigation';
import { getIsUserAuthenticated } from '@/actions/auth';

import { Header } from '@/components/header';

export default async function AuthLayout({
  children,
}: React.PropsWithChildren<{}>) {
  const isUserAuthenticated = await getIsUserAuthenticated();
  if (isUserAuthenticated) redirect('/dashboard');

  return (
    <>
      <Header />
      {children}
    </>
  );
}
