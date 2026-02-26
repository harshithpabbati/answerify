'use client';

import { useCreateOrganization } from '@/states/organization';
import { PlusIcon, RocketIcon } from '@radix-ui/react-icons';

import { Button } from '@/components/ui/button';

export function EmptyState() {
  const [, setCreateOrg] = useCreateOrganization();

  return (
    <div className="flex size-full flex-col items-center justify-center gap-6 px-6 py-20 text-center">
      {/* Icon badge */}
      <div className="bg-main flex size-20 items-center justify-center rounded-full border-2 border-border shadow-base">
        <RocketIcon className="size-9 text-white" />
      </div>

      {/* Text */}
      <div className="max-w-sm space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          No organizations yet
        </h1>
        <p className="text-muted-foreground text-sm">
          Create your first organization and let Answerify handle support emails
          automatically — powered by AI.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {['📬 Inbound Email', '🤖 AI Replies', '📚 Knowledge Base', '⚡ Autopilot'].map(
          (f) => (
            <span
              key={f}
              className="rounded-base border-2 border-border bg-card px-3 py-1 text-xs font-semibold text-card-foreground shadow-base"
            >
              {f}
            </span>
          )
        )}
      </div>

      {/* CTA */}
      <Button onClick={() => setCreateOrg(true)} size="lg">
        <PlusIcon className="mr-2 size-4" />
        Create organization
      </Button>
    </div>
  );
}
