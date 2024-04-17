'use client';

import { useRouter } from 'next/navigation';
import { updateUser } from '@/actions/auth';

import { CreateOrganizationForm } from '@/components/modals/organization/forms';

export function Organization() {
  const router = useRouter();

  const handleOnCreate = async (slug: string) => {
    await updateUser({
      data: {
        onboarding: {
          hasOnboarded: false,
          onboardingStep: 2,
          slug,
        },
      },
    });
    router.push(`/onboarding/${slug}/email-forwarding`);
  };

  return (
    <div>
      <h2 className="text-3xl font-semibold">Organization creation</h2>
      <p className="text-muted-foreground mt-1">
        Tell us about your organization
      </p>
      <div className="mt-4">
        <CreateOrganizationForm onCreate={handleOnCreate} />
      </div>
    </div>
  );
}
