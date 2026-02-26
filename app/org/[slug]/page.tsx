import { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
  if (!org?.id) return notFound();

  const { data: sources } = await getSources(org.id);

  return (
    <WelcomeDashboard
      orgId={org.id}
      orgName={org.name}
      slug={slug}
      inboundEmail={org.inbound_email ?? ''}
      sourcesCount={sources?.length ?? 0}
      autopilotEnabled={org.autopilot_enabled ?? true}
      autopilotThreshold={org.autopilot_threshold ?? 0.65}
    />
  );
}
