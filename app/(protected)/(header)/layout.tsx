import React from 'react';

import { Header } from '@/components/header';

export default function HeaderLayout({
  children,
}: React.PropsWithChildren<{}>) {
  return (
    <div className="flex size-full h-dvh flex-col">
      <Header />
      <div className="size-full flex-1">{children}</div>
    </div>
  );
}
