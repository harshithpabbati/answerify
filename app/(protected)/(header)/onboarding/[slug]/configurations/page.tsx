import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getOrganizationEmail } from '@/actions/organization';

export const metadata: Metadata = {
  title: 'Configurations - Onboarding',
};

export default async function ConfigurationsOnboardingPage({
  params: { slug },
}: {
  params: { slug: string };
}) {
  const { data, error } = await getOrganizationEmail(slug);
  if (error || !data?.inbound_email) return notFound();

  return <p>Configurations</p>;
}
