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
        'flex size-6 shrink-0 items-center justify-center border-2 text-xs font-bold font-mono',
        done
          ? 'border-[#FF4500] bg-[#FF4500] text-white'
          : 'border-[#FF4500]/40 bg-background text-muted-foreground'
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
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#FF4500] mb-2">
          {`// WORKSPACE`}
        </p>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-foreground">
          Welcome to {orgName}
        </h1>
        <p className="font-mono mt-2 text-sm text-gray-400">
          Here&apos;s everything you need to get started with Answerify.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inbound Email Card */}
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>📬 Inbound Email Address</CardTitle>
            <CardDescription>
              Forward your support emails to this address and Answerify will
              handle them automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 border border-[#FF4500]/30 bg-muted px-4 py-3">
              <span className="truncate font-mono text-sm font-medium text-foreground">
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
            <p className="text-gray-400 mt-3 text-sm font-mono">
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
                <span className="font-mono text-sm text-gray-300">
                  Copy your inbound email address
                </span>
              </li>
              <li className="flex items-start gap-3">
                <StepBadge step={2} done={threadsCount > 0} />
                <span className="font-mono text-sm text-gray-300">
                  Set up email forwarding from your support account
                </span>
              </li>
              <li className="flex items-start gap-3">
                <StepBadge step={3} done={sources.length > 0} />
                <span className="font-mono text-sm text-gray-300">
                  Add data sources to power AI replies
                </span>
              </li>
              <li className="flex items-start gap-3">
                <StepBadge step={4} done={repliesCount > 0} />
                <span className="font-mono text-sm text-gray-300">
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
              <span className="border border-[#FF4500] bg-[#FF4500]/10 shrink-0 px-2 py-0.5 text-sm font-bold font-mono text-[#FF4500]">
                {sources.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sources.length === 0 ? (
              <p className="font-mono text-gray-400 text-sm">
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
                      className="flex items-center gap-2 border border-[#FF4500]/20 bg-muted px-3 py-2 text-sm font-mono font-medium text-foreground transition-all hover:border-[#FF4500]/60"
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
                      className="w-full border border-dashed border-[#FF4500]/30 py-2 text-center text-xs font-mono font-semibold text-gray-500 hover:border-[#FF4500] hover:text-[#FF4500]"
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
          <Card className="sm:col-span-2 lg:col-span-1">
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
                  <p className="font-mono text-sm font-semibold text-foreground">
                    Enable Auto-Reply
                  </p>
                  <p className="font-mono text-gray-400 text-xs">
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
                    'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4500] disabled:opacity-50',
                    enabled
                      ? 'border-[#FF4500] bg-[#FF4500]'
                      : 'border-[#FF4500]/30 bg-background'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block size-5 border-2 bg-white shadow-sm transition-transform',
                      enabled
                        ? 'translate-x-5 border-white'
                        : 'translate-x-0.5 border-[#FF4500]/40'
                    )}
                  />
                </button>
              </div>

              {/* Threshold slider row */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm font-semibold text-foreground">
                    Confidence Threshold
                  </p>
                  <span className="border border-[#FF4500] bg-[#FF4500]/10 px-2 py-0.5 text-xs font-bold font-mono tabular-nums text-[#FF4500]">
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
                <div className="font-mono text-gray-500 flex justify-between text-xs">
                  <span>0% — Send everything</span>
                  <span>100% — Only perfect matches</span>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Quick Actions Card */}
          <Card className="sm:col-span-2 lg:col-span-1">
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
