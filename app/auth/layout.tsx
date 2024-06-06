import React from 'react';

import { Header } from '@/components/header';

export default async function AuthLayout({
  children,
}: React.PropsWithChildren<{}>) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
