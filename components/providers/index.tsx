import React from 'react';
import { getUser } from '@/actions/auth';

import { JotaiProvider } from '@/components/providers/JotaiProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

export async function Providers({ children }: React.PropsWithChildren<{}>) {
  const {
    data: { user },
  } = await getUser();
  return (
    <ThemeProvider>
      <JotaiProvider>{children}</JotaiProvider>
    </ThemeProvider>
  );
}
