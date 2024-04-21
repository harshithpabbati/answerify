import { Metadata } from 'next';
import Link from 'next/link';
import { getOrganizations } from '@/actions/organization';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EmptyState } from '@/components/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const organizations = await getOrganizations();

  return (
    <div className="container size-full">
      {organizations.length > 0 ? (
        <>
          <h3 className="pt-10 text-2xl font-semibold">Organizations</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((o) => (
              <Link href={`/org/${o.slug}`}>
                <Card>
                  <CardHeader>
                    <CardTitle>{o.name}</CardTitle>
                    <CardDescription>{o.support_email}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      {new Date(o.created_at).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
