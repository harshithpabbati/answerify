import { Skeleton } from '@/components/ui/skeleton';

export default function OrgLoading() {
  return (
    <div className="flex h-screen flex-col overflow-auto p-6 md:p-10">
      {/* Title skeleton */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-48" />
      </div>

      {/* Cards grid skeleton */}
      <div className="grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-base border-2 border-black p-5 shadow-base"
          >
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
