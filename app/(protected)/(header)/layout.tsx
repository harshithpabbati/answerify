import React from 'react';

import { Header } from '@/components/header';

export default function HeaderLayout({
  children,
}: React.PropsWithChildren<{}>) {
  return (
    <div className="flex flex-col">
      <Header />
      <div className="flex-1">{children}</div>
    </div>
  );
}
