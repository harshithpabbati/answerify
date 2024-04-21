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
import {
  CreateNewOrganizationButton,
  EmptyState,
} from '@/components/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const organizations = await getOrganizations();

  return (
    <div className="container size-full">
      {organizations.length > 0 ? (
        <>
          <div className="flex items-center justify-between pt-10">
            <h3 className="text-2xl font-semibold">Organizations</h3>
            <CreateNewOrganizationButton />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((o) => (
              <Link href={`/org/${o.slug}`} key={o.slug}>
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
