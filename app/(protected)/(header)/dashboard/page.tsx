import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isUserOnboarded } from '@/actions/auth';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const isOnboarded = await isUserOnboarded();
  if (!isOnboarded) return redirect('/onboarding');

  return <p>Dashboard</p>;
}
