'use client';

import { useRouter } from 'next/navigation';
import { updateOnboardingStep } from '@/actions/auth';

import { CreateOrganizationForm } from '@/components/modals/organization/forms';

export function Organization() {
  const router = useRouter();

  const handleOnCreate = async (slug: string) => {
    await updateOnboardingStep(slug, {
      hasOnboarded: false,
      step: 'email-forwarding',
    });
    router.push(`/onboarding/${slug}/email-forwarding`);
  };

  return (
    <div>
      <h2 className="text-3xl font-semibold">Create organization</h2>
      <p className="text-foreground mt-1">Tell us about your organization</p>
      <div className="mt-4">
        <CreateOrganizationForm onCreate={handleOnCreate} />
      </div>
    </div>
  );
}
