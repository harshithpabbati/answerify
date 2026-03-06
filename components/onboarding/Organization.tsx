'use client';

import { useTransitionRouter } from 'next-view-transitions';
import { updateOnboardingStep } from '@/actions/auth';

import { CreateOrganizationForm } from '@/components/modals/organization/forms';

export function Organization() {
  const router = useTransitionRouter();

  const handleOnCreate = async (slug: string) => {
    await updateOnboardingStep(slug, {
      hasOnboarded: false,
      step: 'email-forwarding',
    });
    router.push(`/onboarding/${slug}/email-forwarding`);
  };

  return (
    <div>
      <h2 className="font-display text-3xl font-black uppercase tracking-tight text-foreground">Create organization</h2>
      <p className="font-mono mt-1 text-sm text-gray-400">Tell us about your organization</p>
      <div className="mt-4">
        <CreateOrganizationForm onCreate={handleOnCreate} />
      </div>
    </div>
  );
}
