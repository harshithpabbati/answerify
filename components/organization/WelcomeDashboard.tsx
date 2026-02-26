'use client';

import { useState } from 'react';
import { updateAutopilotSettings } from '@/actions/organization';
import { Tables } from '@/database.types';
import { useAddDataSource, useViewDataSource } from '@/states/data-source';
import { useInviteMembers, useUpdateOrganization } from '@/states/organization';
import {
  CheckIcon,
  ClipboardCopyIcon,
  ExternalLinkIcon,
  Link2Icon,
} from '@radix-ui/react-icons';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Slider } from '../ui/slider';

interface Props {
  orgId: string;
  orgName: string;
  slug: string;
  inboundEmail: string;
  sources: Tables<'datasource'>[];
  threadsCount: number;
  repliesCount: number;
  autopilotEnabled: boolean;
  autopilotThreshold: number;
}

function StepBadge({ step, done }: { step: number; done: boolean }) {
  return (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-border text-xs font-bold',
        done ? 'bg-main text-white' : 'bg-card'
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
  sources,
  threadsCount,
  repliesCount,
  autopilotEnabled,
  autopilotThreshold,
}: Props) {
  const { copied, copyToClipboard } = useCopyToClipboard();
  const [, setAddDataSource] = useAddDataSource();
  const [, setViewDataSource] = useViewDataSource();
  const [, setInviteMembers] = useInviteMembers();
  const [, setUpdateOrganization] = useUpdateOrganization();

  const [enabled, setEnabled] = useState(autopilotEnabled);
  const [threshold, setThreshold] = useState(autopilotThreshold);
  const [saving, setSaving] = useState(false);

  const saveAutopilot = async (nextEnabled: boolean, nextThreshold: number) => {
    setSaving(true);
    const { error } = await updateAutopilotSettings(orgId, {
      autopilot_enabled: nextEnabled,
      autopilot_threshold: nextThreshold,
    });
    setSaving(false);
    if (error) {
      toast.error('Failed to save settings', { description: error.message });
      return false;
    }
    toast.success('Auto-reply settings saved');
    return true;
  };

  const handleToggle = async () => {
    const next = !enabled;
    setEnabled(next);
    const ok = await saveAutopilot(next, threshold);
    if (!ok) setEnabled(!next);
  };

  const handleThresholdCommit = async () => {
    if (saving) return;
    await saveAutopilot(enabled, threshold);
  };

  // Show at most this many sources before collapsing the rest into a "N more" button
  const SOURCE_DISPLAY_LIMIT = 5;
  const visibleSources = sources.slice(0, SOURCE_DISPLAY_LIMIT);
  const hiddenCount = sources.length - SOURCE_DISPLAY_LIMIT;

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
        <Card className="sm:col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle>📬 Inbound Email Address</CardTitle>
            <CardDescription>
              Forward your support emails to this address and Answerify will
              handle them automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-bg flex items-center justify-between gap-3 rounded-base border-2 border-border px-4 py-3 shadow-base">
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
                <span className="text-sm">Copy your inbound email address</span>
              </li>
              <li className="flex items-start gap-3">
                <StepBadge step={2} done={threadsCount > 0} />
                <span className="text-sm">
                  Set up email forwarding from your support account
                </span>
              </li>
              <li className="flex items-start gap-3">
                <StepBadge step={3} done={sources.length > 0} />
                <span className="text-sm">
                  Add data sources to power AI replies
                </span>
              </li>
              <li className="flex items-start gap-3">
                <StepBadge step={4} done={repliesCount > 0} />
                <span className="text-sm">
                  Send a test email and watch Answerify reply!
                </span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Data Sources Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>📚 Data Sources</CardTitle>
                <CardDescription>
                  Knowledge base articles and docs that Answerify uses to
                  generate replies.
                </CardDescription>
              </div>
              <span className="bg-main text-white rounded-base shrink-0 border-2 border-border px-2 py-0.5 text-sm font-bold shadow-base">
                {sources.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sources.length === 0 ? (
              <p className="text-foreground text-sm">
                No data sources yet. Add links to your docs, help center, or
                blog to improve AI-generated replies.
              </p>
            ) : (
              <ul className="space-y-2">
                {visibleSources.map((source) => (
                  <li key={source.id}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open data source: ${source.url}`}
                      className="bg-bg flex items-center gap-2 rounded-base border-2 border-border px-3 py-2 text-sm font-medium transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-base"
                    >
                      <Link2Icon className="size-3.5 shrink-0" />
                      <span className="truncate">{source.url}</span>
                      <ExternalLinkIcon className="ml-auto size-3.5 shrink-0 opacity-50" />
                    </a>
                  </li>
                ))}
                {hiddenCount > 0 && (
                  <li>
                    <button
                      onClick={() => setViewDataSource(orgId)}
                      className="w-full rounded-base border-2 border-dashed border-border py-2 text-center text-xs font-semibold opacity-70 hover:opacity-100"
                    >
                      +{hiddenCount} more source{hiddenCount !== 1 ? 's' : ''}
                    </button>
                  </li>
                )}
              </ul>
            )}
            <Button
              variant="default"
              className="w-full"
              onClick={() => setAddDataSource(slug)}
            >
              + Add Data Source
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          {/* AI Auto-Reply Card */}
          <Card className="sm:col-span-2 md:col-span-1">
            <CardHeader>
              <CardTitle>🤖 AI Auto-Reply</CardTitle>
              <CardDescription>
                When enabled, Answerify automatically sends replies when the AI
                confidence meets the threshold. Adjust the slider to control how
                confident the AI must be before sending.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Toggle row */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Enable Auto-Reply</p>
                  <p className="text-foreground text-xs">
                    {enabled
                      ? 'Replies will be sent automatically when confidence is high enough.'
                      : 'Replies require manual approval before sending.'}
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={enabled}
                  onClick={handleToggle}
                  disabled={saving}
                  className={cn(
                    'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                    enabled ? 'bg-main' : 'bg-card'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block size-5 rounded-full border-2 border-border bg-card shadow-sm transition-transform',
                      enabled ? 'translate-x-5' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>

              {/* Threshold slider row */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Confidence Threshold</p>
                  <span className="bg-main text-white rounded-base border-2 border-border px-2 py-0.5 text-xs font-bold tabular-nums shadow-base">
                    {Math.round(threshold * 100)}%
                  </span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[threshold]}
                  onValueChange={(v) => setThreshold(v[0])}
                  disabled={saving}
                  onMouseUp={handleThresholdCommit}
                  onTouchEnd={handleThresholdCommit}
                />
                <div className="text-foreground flex justify-between text-xs">
                  <span>0% — Send everything</span>
                  <span>100% — Only perfect matches</span>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Quick Actions Card */}
          <Card className="sm:col-span-2 md:col-span-1">
            <CardHeader>
              <CardTitle>⚡ Quick Actions</CardTitle>
              <CardDescription>
                Configure your workspace without digging through menus.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="neutral"
                  onClick={() => setInviteMembers(orgId)}
                >
                  Invite Team Members
                </Button>
                <Button
                  variant="default"
                  onClick={() => setUpdateOrganization(orgId)}
                >
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
