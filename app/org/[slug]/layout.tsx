import { notFound, redirect } from 'next/navigation';
import { getOrganizationBySlug } from '@/actions/organization';

import { Sidebar } from '@/components/sidebar';

export default async function OrgLayout({
  params,
  children,
}: React.PropsWithChildren<{
  params: { slug: string };
}>) {
  const { data, error } = await getOrganizationBySlug(params.slug);
  if (error || !data?.id) return notFound();

  const onboarding = data.onboarding as any;
  if (!onboarding?.hasOnboarded)
    redirect(`/onboarding/${params.slug}/${onboarding.step}`);

  return (
    <div className="flex size-full max-h-dvh overflow-hidden">
      <Sidebar orgId={data.id} name={data.name} slug={params.slug} />
      <div className="hidden flex-1 md:block">{children}</div>
    </div>
  );
}
