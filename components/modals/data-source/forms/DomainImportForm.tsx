'use client';

import { useState } from 'react';
import { setupSources } from '@/actions/source';
import { sourcesQueryKey } from '@/lib/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DiscoverResult {
  baseUrl: string;
  /** Individual content page URLs extracted from sitemap urlsets. */
  pages: string[];
  /** Sitemap XML files that were successfully fetched. */
  sitemapUrls: string[];
  /** Pages grouped by their first path segment (e.g. /docs, /blog). */
  groups: Record<string, string[]>;
}

interface Props {
  slug: string;
  onAdd?(): void;
  /** org ID – used to invalidate the TanStack Query sources cache */
  orgId?: string;
}

export function DomainImportForm({ slug, onAdd, orgId }: Props) {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // Show individual pages when available, fall back to the sitemap files themselves
  const isFallbackMode = result !== null && result.pages.length === 0;
  const displayUrls = result
    ? result.pages.length > 0
      ? result.pages
      : result.sitemapUrls
    : [];

  // Build sorted section entries from groups (or a single flat entry in fallback mode)
  const sections: Array<{ key: string; urls: string[] }> = result
    ? isFallbackMode
      ? [] // fallback shows flat list, no groups
      : Object.entries(result.groups)
          .sort((a, b) => b[1].length - a[1].length) // most pages first
          .map(([key, urls]) => ({ key, urls }))
    : [];

  const hasGroups = sections.length > 1;

  const handleFetch = async () => {
    setError('');
    setResult(null);
    setSelected(new Set());
    setExpanded(new Set());
    setLoading(true);
    try {
      const res = await fetch(
        `/api/robots?domain=${encodeURIComponent(domain)}`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to discover URLs');
        return;
      }
      const data = json as DiscoverResult;
      setResult(data);
      // Pre-select all discovered URLs
      const urls = data.pages.length > 0 ? data.pages : data.sitemapUrls;
      setSelected(new Set(urls));
      // Expand the largest section by default
      if (Object.keys(data.groups).length > 0) {
        const largest = Object.entries(data.groups).sort(
          (a, b) => b[1].length - a[1].length
        )[0];
        if (largest) setExpanded(new Set([largest[0]]));
      }
    } catch {
      setError('Network error – please check the domain and try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleUrl = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const toggleSection = (sectionUrls: string[]) => {
    const allSelected = sectionUrls.every((u) => selected.has(u));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        sectionUrls.forEach((u) => next.delete(u));
      } else {
        sectionUrls.forEach((u) => next.add(u));
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === displayUrls.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(displayUrls));
    }
  };

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    setError('');
    const { error } = await setupSources(
      slug,
      [...selected].map((url) => ({ url }))
    );
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (orgId) {
      await queryClient.invalidateQueries({ queryKey: sourcesQueryKey(orgId) });
    }
    onAdd?.();
  };

  return (
    <div className="w-full space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="domain-input">Domain</Label>
        <div className="flex gap-2">
          <Input
            id="domain-input"
            placeholder="https://example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
          />
          <Button
            type="button"
            onClick={handleFetch}
            disabled={!domain || loading}
          >
            {loading ? 'Discovering…' : 'Discover'}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Enter a domain to discover URLs from its sitemap. A limited number of
          pages are returned; add more manually if needed.
        </p>
      </div>

      {result && displayUrls.length === 0 && (
        <p className="text-muted-foreground py-2 text-sm">
          No sitemap found for this domain. Try adding URLs manually.
        </p>
      )}

      {result && displayUrls.length > 0 && (
        <div className="space-y-2">
          {isFallbackMode && (
            <p className="text-muted-foreground text-xs">
              No individual pages were found — showing sitemap files instead.
            </p>
          )}

          <div className="flex items-center justify-between">
            <Label>
              Select URLs to import ({selected.size}/{displayUrls.length})
            </Label>
            <button
              type="button"
              onClick={toggleAll}
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
            >
              {selected.size === displayUrls.length
                ? 'Deselect all'
                : 'Select all'}
            </button>
          </div>

          {/* Grouped view — one collapsible section per path prefix */}
          {hasGroups ? (
            <div className="max-h-72 space-y-1 overflow-y-auto rounded border p-2">
              {sections.map(({ key, urls }) => {
                const isOpen = expanded.has(key);
                const selectedCount = urls.filter((u) => selected.has(u)).length;
                const allInSection = selectedCount === urls.length;
                const someInSection = selectedCount > 0 && !allInSection;

                return (
                  <div key={key}>
                    {/* Section header */}
                    <div className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-accent">
                      <input
                        type="checkbox"
                        checked={allInSection}
                        ref={(el) => {
                          if (el) el.indeterminate = someInSection;
                        }}
                        onChange={() => toggleSection(urls)}
                        className="shrink-0 accent-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => toggleExpanded(key)}
                        className="flex flex-1 items-center gap-1 text-left"
                      >
                        {isOpen ? (
                          <ChevronDownIcon className="text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRightIcon className="text-muted-foreground shrink-0" />
                        )}
                        <span className="text-xs font-medium">{key}</span>
                        <span className="text-muted-foreground ml-auto text-xs">
                          {selectedCount}/{urls.length}
                        </span>
                      </button>
                    </div>

                    {/* Expanded URL list */}
                    {isOpen && (
                      <ul className="ml-6 space-y-0.5 py-0.5">
                        {urls.map((url) => (
                          <UrlCheckbox
                            key={url}
                            url={url}
                            checked={selected.has(url)}
                            onToggle={() => toggleUrl(url)}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Flat list — only one section or fallback mode */
            <ul className="max-h-72 space-y-1 overflow-y-auto rounded border p-2">
              {displayUrls.map((url) => (
                <UrlCheckbox
                  key={url}
                  url={url}
                  checked={selected.has(url)}
                  onToggle={() => toggleUrl(url)}
                />
              ))}
            </ul>
          )}

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={selected.size === 0 || saving}
          >
            {saving
              ? 'Saving…'
              : `Add ${selected.size} URL${selected.size !== 1 ? 's' : ''}`}
          </Button>
        </div>
      )}
    </div>
  );
}

function UrlCheckbox({
  url,
  checked,
  onToggle,
}: {
  url: string;
  checked: boolean;
  onToggle(): void;
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 hover:bg-accent">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-0.5 shrink-0 accent-orange-500"
        />
        <span className="truncate text-xs">{url}</span>
      </label>
    </li>
  );
}
