'use client';

import { useState } from 'react';
import { setupSources } from '@/actions/source';

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
}

interface Props {
  slug: string;
  onAdd?(): void;
}

export function DomainImportForm({ slug, onAdd }: Props) {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Show individual pages when available, fall back to the sitemap files themselves
  const displayUrls = result
    ? result.pages.length > 0
      ? result.pages
      : result.sitemapUrls
    : [];

  const handleFetch = async () => {
    setError('');
    setResult(null);
    setSelected(new Set());
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
      // Pre-select all discovered URLs so users can deselect what they don't need
      const urls = data.pages.length > 0 ? data.pages : data.sitemapUrls;
      setSelected(new Set(urls));
    } catch {
      setError('Network error – please check the domain and try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
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
    onAdd?.();
  };

  const isFallbackMode = result !== null && result.pages.length === 0;

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

          <ul className="max-h-60 space-y-1 overflow-y-auto rounded border p-2">
            {displayUrls.map((url) => (
              <UrlCheckbox
                key={url}
                url={url}
                checked={selected.has(url)}
                onToggle={() => toggle(url)}
              />
            ))}
          </ul>

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
