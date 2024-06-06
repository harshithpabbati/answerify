'use client';

import { useParams, useRouter } from 'next/navigation';
import { updateOnboardingStep } from '@/actions/auth';

import { AddDataSourceForm } from '@/components/modals/data-source/forms';

export function DataSources() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();

  const onAdd = async () => {
    await updateOnboardingStep(params.slug, {
      hasOnboarded: true,
      step: 'configurations',
    });
    router.push(`/org/${params.slug}`);
  };

  return (
    <div>
      <h2 className="text-3xl font-semibold">Setup Datasources</h2>
      <p className="text-foreground mt-1">
        Add your links to the docs, blogs & other help center docs
      </p>
      <div className="mt-4">
        <AddDataSourceForm onAdd={onAdd} slug={params.slug} />
      </div>
    </div>
  );
}
