import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/actions/auth';

import { Organization } from '@/components/onboarding';

export const metadata: Metadata = {
  title: 'Onboarding',
};

const steps = [
  'onboarding',
  'email-forwarding',
  'data-sources',
  'configurations',
];

export default async function OnboardingPage() {
  const {
    data: { user },
  } = await getUser();
  if (user?.user_metadata?.onboarding?.onboardingStep > 1)
    return redirect(
      `/onboarding/${user?.user_metadata?.onboarding?.slug}/${steps[user?.user_metadata?.onboarding?.onboardingStep - 1]}`
    );

  return <Organization />;
}
