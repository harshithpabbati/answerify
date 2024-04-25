import React from 'react';

import { Steps } from '@/components/onboarding';

export default async function OnboardingLayout({
  children,
}: React.PropsWithChildren<{}>) {
  return (
    <div className="flex size-full items-center justify-center">
      <div className="flex h-full w-1/3 flex-col items-center justify-center">
        <Steps />
      </div>
      <div className="bg-background h-full w-2/3 border-l p-10">{children}</div>
    </div>
  );
}
