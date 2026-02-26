import { Metadata } from 'next';
import { getOrganizations } from '@/actions/organization';
import { Link } from 'next-view-transitions';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import {
  CreateNewOrganizationButton,
  EmptyState,
} from '@/components/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
};

// Revalidate every 60 seconds to keep dashboard fresh
export const revalidate = 60;

// Deterministic palette for the initial-letter block on each org card
// lime · slate · yellow · rose · emerald
const PALETTE = ['#A3E636', '#E0E7F1', '#FFD60A', '#FCA5A5', '#6EE7B7'];
function orgColor(name: string) {
  return PALETTE[name.charCodeAt(0) % PALETTE.length];
}

export default async function DashboardPage() {
  const organizations = await getOrganizations();

  return (
    <div className="flex h-full flex-col overflow-auto">
      {organizations.length > 0 ? (
        <>
          {/* Bold lime header with grid background */}
          <div className="bg-background border-b-2 border-black bg-grid px-6 py-10 md:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-4xl font-bold tracking-tight">
                  Your organizations
                </h1>
                <p className="mt-1 font-medium">
                  {organizations.length} workspace
                  {organizations.length !== 1 ? 's' : ''} &mdash; pick one to
                  get started
                </p>
              </div>
              <CreateNewOrganizationButton />
            </div>
          </div>

          {/* Org grid */}
          <div className="p-6 md:p-10">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {organizations.map((o: any) => {
                const hasOnboarded = !!(o?.onboarding as any)?.hasOnboarded;
                const href = hasOnboarded
                  ? `/org/${o.slug}`
                  : `/onboarding/${o.slug}/${(o.onboarding as any)?.step}`;
                const initial = o.name.charAt(0).toUpperCase();
                const bg = orgColor(o.name);

                return (
                  <Link href={href} key={o.slug}>
                    <Card className="flex h-full flex-col transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none">
                      {/* Colored block with large initial */}
                      <div
                        className="flex h-24 items-center border-b-2 border-black px-6"
                        style={{ backgroundColor: bg }}
                      >
                        <span className="text-5xl font-bold">{initial}</span>
                      </div>

                      <CardContent className="flex flex-1 flex-col gap-2 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="text-lg font-bold leading-snug">
                              {o.name}
                            </h2>
                            <p className="truncate text-sm text-black/60">
                              {o.support_email}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'shrink-0 rounded-base border-2 border-black px-2 py-0.5 text-xs font-bold',
                              hasOnboarded ? 'bg-main' : 'bg-white'
                            )}
                          >
                            {hasOnboarded ? 'Live' : 'Setup'}
                          </span>
                        </div>
                        <p className="mt-auto text-xs text-black/40 tabular-nums">
                          Created{' '}
                          {new Date(o.created_at).toLocaleDateString(
                            undefined,
                            { year: 'numeric', month: 'short', day: 'numeric' }
                          )}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
