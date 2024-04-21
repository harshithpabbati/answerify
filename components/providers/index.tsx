import React from 'react';
import { getUser } from '@/actions/auth';
import { OpenpanelProvider } from '@openpanel/nextjs';

import { JotaiProvider } from '@/components/providers/JotaiProvider';

export async function Providers({ children }: React.PropsWithChildren<{}>) {
  const {
    data: { user },
  } = await getUser();
  return (
    <JotaiProvider>
      <OpenpanelProvider
        url="https://api.openpanel.dev"
        clientId="71e50127-4c7d-4624-987c-db31a909d538"
        trackScreenViews={true}
        trackAttributes={true}
        trackOutgoingLinks={true}
        profileId={user?.id}
      />
      {children}
    </JotaiProvider>
  );
}
