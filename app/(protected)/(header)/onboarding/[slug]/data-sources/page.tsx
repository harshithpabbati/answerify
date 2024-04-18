import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getOrganizationEmail } from '@/actions/organization';

export const metadata: Metadata = {
  title: 'Setup datasources - Onboarding',
};

export default async function DataSourcesOnboardingPage({
  params: { slug },
}: {
  params: { slug: string };
}) {
  const { data, error } = await getOrganizationEmail(slug);
  if (error || !data?.inbound_email) return notFound();

  return <p>Datasources</p>;
}
