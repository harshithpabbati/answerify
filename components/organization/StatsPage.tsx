'use client';

import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface StatsData {
  openThreads: number;
  closedThreads: number;
  totalReplies: number;
  replyStatusCounts: Record<string, number>;
  perfectCount: number;
  editedCount: number;
  dayLabels: string[];
  threadsByDay: number[];
  repliesByDay: number[];
}

interface Props {
  orgName: string;
  stats: StatsData;
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-400">
          {label}
        </p>
        <p
          className={cn(
            'mt-2 font-display text-4xl font-black tabular-nums tracking-tight',
            accent ? 'text-[#FF4500]' : 'text-white'
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function BarChart({
  labels,
  seriesA,
  seriesB,
  legendA,
  legendB,
}: {
  labels: string[];
  seriesA: number[];
  seriesB: number[];
  legendA: string;
  legendB: string;
}) {
  const max = Math.max(...seriesA, ...seriesB, 1);

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <span className="flex items-center gap-2 font-mono text-xs text-gray-400">
          <span className="inline-block size-2.5 bg-[#FF4500]" />
          {legendA}
        </span>
        <span className="flex items-center gap-2 font-mono text-xs text-gray-400">
          <span className="inline-block size-2.5 bg-[#FF4500]/40" />
          {legendB}
        </span>
      </div>
      <div className="flex items-end gap-2" style={{ height: 160 }}>
        {labels.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="flex w-full items-end justify-center gap-0.5"
              style={{ height: 140 }}
            >
              <div
                className="w-1/3 bg-[#FF4500] transition-all duration-500"
                style={{
                  height: `${(seriesA[i] / max) * 100}%`,
                  minHeight: seriesA[i] > 0 ? 4 : 0,
                }}
                title={`${legendA}: ${seriesA[i]}`}
              />
              <div
                className="w-1/3 bg-[#FF4500]/40 transition-all duration-500"
                style={{
                  height: `${(seriesB[i] / max) * 100}%`,
                  minHeight: seriesB[i] > 0 ? 4 : 0,
                }}
                title={`${legendB}: ${seriesB[i]}`}
              />
            </div>
            <span className="font-mono text-[10px] uppercase text-gray-500">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-gray-300">{label}</span>
        <span className="font-mono text-sm font-bold tabular-nums text-white">
          {value}
          <span className="ml-1 text-xs text-gray-500">
            ({Math.round(pct)}%)
          </span>
        </span>
      </div>
      <div className="h-2 w-full bg-[#1a1a1a]">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function StatsPage({ orgName, stats }: Props) {
  const totalThreads = stats.openThreads + stats.closedThreads;
  const totalReviewed = stats.perfectCount + stats.editedCount;
  const accuracyPct =
    totalReviewed > 0
      ? Math.round((stats.perfectCount / totalReviewed) * 100)
      : 0;

  return (
    <div className="flex h-screen flex-col overflow-auto p-6 md:p-10">
      <div className="mb-8">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[#FF4500]">
          // STATS
        </p>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white">
          {orgName} Analytics
        </h1>
        <p className="mt-2 font-mono text-sm text-gray-400">
          Key metrics and activity for your workspace.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Threads" value={totalThreads} />
        <StatCard label="Open Threads" value={stats.openThreads} accent />
        <StatCard label="Total Replies" value={stats.totalReplies} />
        <StatCard label="AI Accuracy" value={accuracyPct} accent />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>📊 Activity — Last 7 Days</CardTitle>
            <CardDescription>
              Daily breakdown of incoming threads and AI-generated replies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              labels={stats.dayLabels}
              seriesA={stats.threadsByDay}
              seriesB={stats.repliesByDay}
              legendA="Threads"
              legendB="Replies"
            />
          </CardContent>
        </Card>

        {/* Thread Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>🎯 Thread Status</CardTitle>
            <CardDescription>
              Open vs closed breakdown across all conversations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressBar
              label="Open"
              value={stats.openThreads}
              total={totalThreads}
              color="#FF4500"
            />
            <ProgressBar
              label="Closed"
              value={stats.closedThreads}
              total={totalThreads}
              color="#FF4500AA"
            />
          </CardContent>
        </Card>

        {/* Reply Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>🤖 Reply Quality</CardTitle>
            <CardDescription>
              How well the AI replies matched expectations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.totalReplies === 0 ? (
              <p className="font-mono text-sm text-gray-400">
                No replies generated yet. Stats will appear once the AI starts
                responding to emails.
              </p>
            ) : (
              <>
                <ProgressBar
                  label="Perfect (unedited)"
                  value={stats.perfectCount}
                  total={stats.totalReplies}
                  color="#22c55e"
                />
                <ProgressBar
                  label="Edited before send"
                  value={stats.editedCount}
                  total={stats.totalReplies}
                  color="#f59e0b"
                />
                <ProgressBar
                  label="Pending review"
                  value={
                    stats.totalReplies -
                    stats.perfectCount -
                    stats.editedCount
                  }
                  total={stats.totalReplies}
                  color="#6b7280"
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Reply Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>⚡ Reply Status Breakdown</CardTitle>
            <CardDescription>
              Current state of all AI-generated replies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.totalReplies === 0 ? (
              <p className="font-mono text-sm text-gray-400">
                No replies yet.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(stats.replyStatusCounts).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="border border-[#FF4500]/20 bg-[#0a0a0a] p-4"
                    >
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                        {status}
                      </p>
                      <p className="mt-1 font-display text-2xl font-black tabular-nums text-white">
                        {count}
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
