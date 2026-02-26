import { Metadata } from 'next';
import { getOrganizations } from '@/actions/organization';
import {
  CheckCircledIcon,
  LightningBoltIcon,
  PersonIcon,
} from '@radix-ui/react-icons';
import { Link } from 'next-view-transitions';

import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
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

// Revalidate every 60 seconds to keep dashboard fresh
export const revalidate = 60;

export default async function DashboardPage() {
  const organizations = await getOrganizations();

  const onboardedCount = organizations.filter(
    (o: any) => (o?.onboarding as any)?.hasOnboarded
  ).length;
  const autopilotCount = organizations.filter(
    (o: any) => o?.autopilot_enabled
  ).length;

  return (
    <div className="flex h-full flex-col overflow-auto">
      {organizations.length > 0 ? (
        <>
          {/* Page header */}
          <div className="border-b-2 border-black bg-white px-6 py-8 md:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Organizations
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Manage all your Answerify workspaces in one place.
                </p>
              </div>
              <CreateNewOrganizationButton />
            </div>

            {/* Stat strip */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="bg-bg rounded-base flex items-center gap-3 border-2 border-black px-4 py-3 shadow-base">
                <PersonIcon className="size-5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-black/60">Total</p>
                  <p className="text-xl font-bold">{organizations.length}</p>
                </div>
              </div>
              <div className="bg-bg rounded-base flex items-center gap-3 border-2 border-black px-4 py-3 shadow-base">
                <CheckCircledIcon className="size-5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-black/60">Live</p>
                  <p className="text-xl font-bold">{onboardedCount}</p>
                </div>
              </div>
              <div className="bg-main rounded-base flex items-center gap-3 border-2 border-black px-4 py-3 shadow-base">
                <LightningBoltIcon className="size-5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-black/60">
                    Autopilot
                  </p>
                  <p className="text-xl font-bold">{autopilotCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Org grid */}
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 md:p-10 lg:grid-cols-3">
            {organizations.map((o: any) => {
              const hasOnboarded = !!(o?.onboarding as any)?.hasOnboarded;
              const href = hasOnboarded
                ? `/org/${o.slug}`
                : `/onboarding/${o.slug}/${(o.onboarding as any)?.step}`;
              const autopilotOn = !!o?.autopilot_enabled;

              return (
                <Link href={href} key={o.slug} className="group block">
                  <Card className="h-full transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg leading-snug">
                          {o.name}
                        </CardTitle>
                        <span
                          className={cn(
                            'rounded-base shrink-0 border-2 border-black px-2 py-0.5 text-xs font-bold',
                            hasOnboarded ? 'bg-main' : 'bg-white'
                          )}
                        >
                          {hasOnboarded ? 'Live' : 'Setup'}
                        </span>
                      </div>
                      <p className="text-muted-foreground truncate text-sm">
                        {o.support_email}
                      </p>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-2 pt-0">
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {new Date(o.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-base border-2 border-black px-2 py-0.5 text-xs font-semibold',
                          autopilotOn ? 'bg-main' : 'bg-white text-black/50'
                        )}
                      >
                        <LightningBoltIcon className="size-3" />
                        {autopilotOn ? 'Autopilot' : 'Manual'}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
