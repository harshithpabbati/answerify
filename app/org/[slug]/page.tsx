import { Metadata } from 'next';
import { getOrganizationBySlug } from '@/actions/organization';
import { getSources } from '@/actions/source';

import { WelcomeDashboard } from '@/components/organization/WelcomeDashboard';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data, error } = await getOrganizationBySlug(slug);
  return {
    title: error ? 'Not found' : data?.name,
  };
}

export default async function OrgPage({ params }: Props) {
  const { slug } = await params;
  const { data: org } = await getOrganizationBySlug(slug);
  const { data: sources } = org?.id
    ? await getSources(org.id)
    : { data: [] };

  return (
    <WelcomeDashboard
      orgName={org?.name ?? ''}
      inboundEmail={org?.inbound_email ?? ''}
      sourcesCount={sources?.length ?? 0}
    />
  );
}
