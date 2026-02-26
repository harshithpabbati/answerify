'use client';

import { CheckIcon, ClipboardCopyIcon } from '@radix-ui/react-icons';
import { useAddDataSource, useViewDataSource } from '@/states/data-source';
import {
  useInviteMembers,
  useUpdateOrganization,
} from '@/states/organization';

import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Props {
  orgId: string;
  orgName: string;
  slug: string;
  inboundEmail: string;
  sourcesCount: number;
}

function StepBadge({ step, done }: { step: number; done: boolean }) {
  return (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-black text-xs font-bold',
        done ? 'bg-main' : 'bg-white'
      )}
    >
      {done ? '✓' : step}
    </span>
  );
}

export function WelcomeDashboard({
  orgId,
  orgName,
  slug,
  inboundEmail,
  sourcesCount,
}: Props) {
  const { copied, copyToClipboard } = useCopyToClipboard();
  const [, setAddDataSource] = useAddDataSource();
  const [, setViewDataSource] = useViewDataSource();
  const [, setInviteMembers] = useInviteMembers();
  const [, setUpdateOrganization] = useUpdateOrganization();

  return (
    <div className="flex h-screen flex-col overflow-auto p-6 md:p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to {orgName} 👋
        </h1>
        <p className="text-foreground mt-2">
          Here&apos;s everything you need to get started with Answerify.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Inbound Email Card */}
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle>📬 Inbound Email Address</CardTitle>
            <CardDescription>
              Forward your support emails to this address and Answerify will
              handle them automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-bg flex items-center justify-between gap-3 rounded-base border-2 border-black px-4 py-3 shadow-base">
              <span className="truncate font-mono text-sm font-medium">
                {inboundEmail || 'Not configured yet'}
              </span>
              {inboundEmail && (
                <button
                  onClick={() => copyToClipboard(inboundEmail)}
                  className="shrink-0 rounded p-1 transition-opacity hover:opacity-70"
                  aria-label="Copy inbound email"
                >
                  {copied ? (
                    <CheckIcon className="size-5" />
                  ) : (
                    <ClipboardCopyIcon className="size-5" />
                  )}
                </button>
              )}
            </div>
            <p className="text-foreground mt-3 text-sm">
              Set up email forwarding from your support account to this address.
              See guides for{' '}
              <a
                href="https://support.google.com/mail/answer/10957"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Gmail
              </a>
              ,{' '}
              <a
                href="https://support.google.com/a/answer/10486484"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Google Workspace
              </a>
              , or{' '}
              <a
                href="https://docs.microsoft.com/en-us/microsoft-365/admin/email/configure-email-forwarding"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Microsoft 365
              </a>
              .
            </p>
          </CardContent>
        </Card>

        {/* Data Sources Card */}
        <Card>
          <CardHeader>
            <CardTitle>📚 Data Sources</CardTitle>
            <CardDescription>
              Knowledge base articles and docs that Answerify uses to generate
              replies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold">{sourcesCount}</span>
              <span className="text-foreground mb-1 text-sm">
                source{sourcesCount !== 1 ? 's' : ''} configured
              </span>
            </div>
            {sourcesCount === 0 && (
              <p className="text-foreground mt-3 text-sm">
                No data sources yet. Add links to your docs, help center, or
                blog to improve AI-generated replies.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Start Card */}
        <Card>
          <CardHeader>
            <CardTitle>🚀 Quick Start</CardTitle>
            <CardDescription>
              Follow these steps to get Answerify working for your team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <StepBadge step={1} done={!!inboundEmail} />
                <span className="text-sm">
                  Copy your inbound email address above
                </span>
              </li>
              <li className="flex items-start gap-3">
                <StepBadge step={2} done={false} />
                <span className="text-sm">
                  Set up email forwarding from your support account
                </span>
              </li>
              <li className="flex items-start gap-3">
                <StepBadge step={3} done={sourcesCount > 0} />
                <span className="text-sm">
                  Add data sources to power AI replies
                </span>
              </li>
              <li className="flex items-start gap-3">
                <StepBadge step={4} done={false} />
                <span className="text-sm">
                  Send a test email and watch Answerify reply!
                </span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle>⚡ Quick Actions</CardTitle>
            <CardDescription>
              Configure your workspace without digging through menus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="default"
                onClick={() => setAddDataSource(slug)}
              >
                + Add Data Source
              </Button>
              <Button
                variant="neutral"
                onClick={() => setViewDataSource(orgId)}
              >
                View Data Sources
              </Button>
              <Button
                variant="neutral"
                onClick={() => setInviteMembers(orgId)}
              >
                Invite Team Members
              </Button>
              <Button
                variant="neutral"
                onClick={() => setUpdateOrganization(orgId)}
              >
                Configure Organization
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

