'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  updateAutopilotSettings,
  updateTonePolicy,
} from '@/actions/organization';
import { fetchSources } from '@/actions/source';
import { fetchApiConnections } from '@/actions/api-connection';
import { Tables } from '@/database.types';
import { useAddDataSource, useViewDataSource } from '@/states/data-source';
import { useManageApiConnections } from '@/states/api-connection';
import {
  useInviteMembers,
  useTestSandbox,
  useUpdateOrganization,
} from '@/states/organization';
import {
  CheckIcon,
  ClipboardCopyIcon,
  ExternalLinkIcon,
  Link2Icon,
} from '@radix-ui/react-icons';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { sourcesQueryKey, apiConnectionsQueryKey } from '@/lib/query-keys';
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
import { EmbeddingStatusBadge } from '@/components/ui/EmbeddingStatusBadge';

import { Slider } from '../ui/slider';

interface Props {
  orgId: string;
  orgName: string;
  slug: string;
  inboundEmail: string;
  supportEmail: string;
  sources: Tables<'datasource'>[];
  threadsCount: number;
  repliesCount: number;
  autopilotEnabled: boolean;
  autopilotThreshold: number;
  initialTonePolicy: string | null;
  initialApiConnections: Tables<'api_connection'>[];
  workflowsCount: number;
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 border border-[#FF4500]/20 bg-muted/50 px-4 py-3">
      <span className="font-display text-2xl font-black tabular-nums text-foreground">
        {value.toLocaleString()}
      </span>
      <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

// ─── Step badge ───────────────────────────────────────────────────────────────

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

// ─── Action card ──────────────────────────────────────────────────────────────

function ActionCard({
  icon,
  title,
  description,
  badge,
  children,
}: {
  icon: string;
  title: string;
  description: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="text-2xl leading-none">{icon}</span>
          {badge}
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto pt-0">{children}</CardContent>
    </Card>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="border border-[#FF4500] bg-[#FF4500]/10 px-2 py-0.5 font-mono text-xs font-bold text-[#FF4500]">
      {count}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WelcomeDashboard({
  orgId,
  orgName,
  slug,
  inboundEmail,
  supportEmail,
  sources: initialSources,
  threadsCount,
  repliesCount,
  autopilotEnabled,
  autopilotThreshold,
  initialTonePolicy,
  initialApiConnections,
  workflowsCount,
}: Props) {
  const { copied, copyToClipboard } = useCopyToClipboard();
  const [, setAddDataSource] = useAddDataSource();
  const [, setViewDataSource] = useViewDataSource();
  const [, setInviteMembers] = useInviteMembers();
  const [, setUpdateOrganization] = useUpdateOrganization();
  const [, setTestSandbox] = useTestSandbox();
  const [, setManageApiConnections] = useManageApiConnections();

  const [enabled, setEnabled] = useState(autopilotEnabled);
  const [threshold, setThreshold] = useState(autopilotThreshold);
  const [saving, setSaving] = useState(false);

  const [tonePolicy, setTonePolicy] = useState(initialTonePolicy ?? '');
  const [savingTone, setSavingTone] = useState(false);

  // TanStack Query – seeded with server-fetched data, polls while sources are indexing
  const { data: sources = initialSources } = useQuery<Tables<'datasource'>[]>({
    queryKey: sourcesQueryKey(orgId),
    queryFn: () => fetchSources(orgId),
    initialData: initialSources,
    refetchInterval: (query) => {
      const list = (query.state.data ?? []) as Tables<'datasource'>[];
      const hasProcessing = list.some(
        (s) => s.status === 'pending' || s.status === 'processing'
      );
      return hasProcessing ? 4_000 : false;
    },
  });

  // Seed the API connections cache with SSR data so the modal shows instantly.
  const { data: apiConnections = initialApiConnections } = useQuery<
    Tables<'api_connection'>[]
  >({
    queryKey: apiConnectionsQueryKey(orgId),
    queryFn: () => fetchApiConnections(orgId),
    initialData: initialApiConnections,
  });

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

  const handleSaveTonePolicy = async () => {
    setSavingTone(true);
    const { error } = await updateTonePolicy(orgId, tonePolicy);
    setSavingTone(false);
    if (error) {
      toast.error('Failed to save tone & policy', {
        description: error.message,
      });
    } else {
      toast.success('Tone & policy saved');
    }
  };

  // Show at most this many sources before collapsing into "N more"
  const SOURCE_DISPLAY_LIMIT = 5;
  const visibleSources = sources.slice(0, SOURCE_DISPLAY_LIMIT);
  const hiddenCount = sources.length - SOURCE_DISPLAY_LIMIT;

  return (
    <div className="flex h-screen flex-col overflow-auto">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="border-b border-[#FF4500]/20 px-6 py-6 md:px-10">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-[#FF4500]">
          {'// WORKSPACE'}
        </p>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-foreground">
          {orgName}
        </h1>

        {/* Stats row */}
        <div className="mt-5 flex flex-wrap gap-3">
          <StatChip value={threadsCount} label="Threads" />
          <StatChip value={repliesCount} label="Replies sent" />
          <StatChip value={sources.length} label="Data sources" />
          <StatChip value={apiConnections.length} label="API connections" />
          <StatChip value={workflowsCount} label="Workflows" />
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-6 md:p-10">
        <div className="space-y-6">

          {/* ── Row 1: Setup ─────────────────────────────────────────────── */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Inbound Email */}
            <Card>
              <CardHeader>
                <CardTitle>📬 Inbound Email</CardTitle>
                <CardDescription>
                  Forward your support emails here and Answerify handles the
                  rest automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3 border border-[#FF4500]/30 bg-muted px-4 py-3">
                  <span className="truncate font-mono text-sm font-medium text-foreground">
                    {inboundEmail || 'Not configured yet'}
                  </span>
                  {inboundEmail && (
                    <button
                      onClick={() => copyToClipboard(inboundEmail)}
                      className="shrink-0 p-1 transition-opacity hover:opacity-70"
                      aria-label="Copy inbound email"
                    >
                      {copied ? (
                        <CheckIcon className="size-5 text-[#FF4500]" />
                      ) : (
                        <ClipboardCopyIcon className="size-5" />
                      )}
                    </button>
                  )}
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  Forwarding guides:{' '}
                  <a
                    href="https://support.google.com/mail/answer/10957"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF4500] underline underline-offset-2"
                  >
                    Gmail
                  </a>
                  {' · '}
                  <a
                    href="https://support.google.com/a/answer/10486484"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF4500] underline underline-offset-2"
                  >
                    Google Workspace
                  </a>
                  {' · '}
                  <a
                    href="https://docs.microsoft.com/en-us/microsoft-365/admin/email/configure-email-forwarding"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF4500] underline underline-offset-2"
                  >
                    Microsoft 365
                  </a>
                </p>
              </CardContent>
            </Card>

            {/* Quick Start */}
            <Card>
              <CardHeader>
                <CardTitle>🚀 Quick Start</CardTitle>
                <CardDescription>
                  Follow these steps to get Answerify working for your team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {[
                    {
                      label: 'Copy your inbound email address',
                      done: !!inboundEmail,
                    },
                    {
                      label: 'Set up email forwarding from your support account',
                      done: threadsCount > 0,
                    },
                    {
                      label: 'Add data sources to power AI replies',
                      done: sources.length > 0,
                    },
                    {
                      label: 'Send a test email and watch Answerify reply!',
                      done: repliesCount > 0,
                    },
                  ].map(({ label, done }, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <StepBadge step={i + 1} done={done} />
                      <span
                        className={cn(
                          'font-mono text-sm leading-snug',
                          done
                            ? 'text-muted-foreground line-through'
                            : 'text-foreground'
                        )}
                      >
                        {label}
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* ── Row 2: Data Sources + AI configuration ───────────────────── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Data Sources */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>📚 Data Sources</CardTitle>
                    <CardDescription>
                      Knowledge base articles and docs that power AI replies.
                    </CardDescription>
                  </div>
                  <CountBadge count={sources.length} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {sources.length === 0 ? (
                  <p className="font-mono text-sm text-muted-foreground">
                    No data sources yet. Add links to your docs, help center,
                    or blog to improve AI-generated replies.
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
                          className={cn(
                            'flex items-center gap-2 border bg-muted px-3 py-2 text-sm font-mono font-medium text-foreground transition-all',
                            source.status === 'ready'
                              ? 'border-[#FF4500]/20 hover:border-[#FF4500]/60'
                              : source.status === 'error'
                                ? 'border-red-500/30 hover:border-red-500/60'
                                : 'border-amber-500/30 hover:border-amber-500/60'
                          )}
                        >
                          <Link2Icon className="size-3.5 shrink-0" />
                          <span className="truncate">{source.url}</span>
                          <EmbeddingStatusBadge status={source.status} />
                          <ExternalLinkIcon className="size-3.5 shrink-0 opacity-50" />
                        </a>
                      </li>
                    ))}
                    {hiddenCount > 0 && (
                      <li>
                        <button
                          onClick={() => setViewDataSource(orgId)}
                          className="w-full border border-dashed border-[#FF4500]/30 py-2 text-center text-xs font-mono font-semibold text-muted-foreground hover:border-[#FF4500] hover:text-[#FF4500]"
                        >
                          +{hiddenCount} more source
                          {hiddenCount !== 1 ? 's' : ''}
                        </button>
                      </li>
                    )}
                  </ul>
                )}
                <div className="flex gap-2">
                  {sources.length > 0 && (
                    <Button
                      variant="neutral"
                      className="flex-1"
                      onClick={() => setViewDataSource(orgId)}
                    >
                      View All
                    </Button>
                  )}
                  <Button
                    variant="default"
                    className={sources.length > 0 ? 'flex-1' : 'w-full'}
                    onClick={() => setAddDataSource({ slug, orgId })}
                  >
                    + Add Source
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Config column */}
            <div className="flex flex-col gap-6">
              {/* AI Auto-Reply */}
              <Card>
                <CardHeader>
                  <CardTitle>🤖 AI Auto-Reply</CardTitle>
                  <CardDescription>
                    Automatically send replies when the AI confidence meets the
                    threshold you set.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Toggle */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        Enable Auto-Reply
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {enabled
                          ? 'Replies sent automatically when confidence is high enough.'
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

                  {/* Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-sm font-semibold text-foreground">
                        Confidence Threshold
                      </p>
                      <span className="border border-[#FF4500] bg-[#FF4500]/10 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-[#FF4500]">
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
                    <div className="flex justify-between font-mono text-xs text-muted-foreground">
                      <span>0% — Send everything</span>
                      <span>100% — Only perfect matches</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tone & Policy */}
              <Card>
                <CardHeader>
                  <CardTitle>🎨 Tone &amp; Policy</CardTitle>
                  <CardDescription>
                    Describe how the AI should sound and any rules it must
                    follow (e.g. &ldquo;Always respond formally&rdquo;).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <textarea
                    rows={4}
                    value={tonePolicy}
                    onChange={(e) => setTonePolicy(e.target.value)}
                    placeholder="e.g. Always respond in a formal tone. Never mention pricing. Sign off with 'Warm regards, the Support Team'."
                    className="w-full resize-y border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF4500]"
                  />
                  <Button
                    onClick={handleSaveTonePolicy}
                    disabled={savingTone}
                    className="w-full"
                  >
                    {savingTone ? 'Saving…' : 'Save Tone & Policy'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Row 3: Tools grid ─────────────────────────────────────────── */}
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[#FF4500]">
              {'// TOOLS & SETTINGS'}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {/* Team */}
              <ActionCard
                icon="👥"
                title="Team"
                description="Invite team members and manage workspace settings."
              >
                <div className="flex flex-col gap-2">
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => setInviteMembers(orgId)}
                  >
                    Invite Members
                  </Button>
                  <Button
                    variant="neutral"
                    className="w-full"
                    onClick={() =>
                      setUpdateOrganization({
                        id: orgId,
                        name: orgName,
                        support_email: supportEmail,
                      })
                    }
                  >
                    Settings
                  </Button>
                </div>
              </ActionCard>

              {/* API Connections */}
              <ActionCard
                icon="🔌"
                title="API Connections"
                description="Connect external APIs to enrich AI context and actions."
                badge={<CountBadge count={apiConnections.length} />}
              >
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => setManageApiConnections({ orgId, slug })}
                >
                  Manage Connections
                </Button>
              </ActionCard>

              {/* Workflows */}
              <ActionCard
                icon="⚡"
                title="Workflows"
                description="Automate actions based on email conditions — tag threads, send replies, call webhooks and more."
                badge={<CountBadge count={workflowsCount} />}
              >
                <Button variant="default" className="w-full" asChild>
                  <Link href={`/org/${slug}/workflows`}>Open Workflows</Link>
                </Button>
              </ActionCard>

              {/* Sandbox */}
              <ActionCard
                icon="🧪"
                title="Sandbox"
                description="Send a test email to preview how Answerify would respond."
              >
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => setTestSandbox(orgId)}
                >
                  Open Sandbox
                </Button>
              </ActionCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
