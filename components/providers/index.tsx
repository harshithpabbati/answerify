import React from 'react';

import { JotaiProvider } from '@/components/providers/JotaiProvider';

export function Providers({ children }: React.PropsWithChildren<{}>) {
  return <JotaiProvider>{children}</JotaiProvider>;
}
