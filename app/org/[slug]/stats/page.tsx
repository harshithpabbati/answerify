import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getOrganizationBySlug } from '@/actions/organization';
import { getDetailedOrgStats } from '@/actions/email';

import { StatsPage } from '@/components/organization/StatsPage';

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: 'Stats',
};

export default async function OrgStatsPage({ params }: Props) {
  const { slug } = await params;
  const { data: org } = await getOrganizationBySlug(slug);
  if (!org?.id) return notFound();

  const stats = await getDetailedOrgStats(org.id);

  return <StatsPage orgName={org.name} stats={stats} />;
}
