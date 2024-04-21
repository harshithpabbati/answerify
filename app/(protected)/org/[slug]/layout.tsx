import { notFound } from 'next/navigation';
import { getOrganizationBySlug } from '@/actions/organization';

import { EmailsList } from '@/components/organization';

export default async function OrgLayout({
  params,
  children,
}: React.PropsWithChildren<{
  params: { slug: string };
}>) {
  const { data, error } = await getOrganizationBySlug(params.slug);
  if (error || !data?.id) return notFound();

  return (
    <div className="flex size-full max-h-dvh">
      <div className="bg-background h-full w-[40dvw] border-r lg:w-[25dvw]">
        <EmailsList orgId={data.id} name={data.name} slug={params.slug} />
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
