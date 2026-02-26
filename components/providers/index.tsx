import React from 'react';
import { getUser } from '@/actions/auth';

import { JotaiProvider } from '@/components/providers/JotaiProvider';

export async function Providers({ children }: React.PropsWithChildren<{}>) {
  const {
    data: { user },
  } = await getUser();
  return <JotaiProvider>{children}</JotaiProvider>;
}
