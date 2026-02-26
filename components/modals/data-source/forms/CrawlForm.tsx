'use client';

import { useState } from 'react';
import { setupSources } from '@/actions/source';
import { Link2Icon, MagnifyingGlassIcon } from '@radix-ui/react-icons';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  slug: string;
  onAdd?(): void;
}

export function CrawlDataSourceForm({ slug, onAdd }: Props) {
  const [url, setUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [pages, setPages] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [crawled, setCrawled] = useState(false);

  const handleCrawl = async () => {
    if (!url) return;
    setCrawling(true);
    setError('');
    setCrawled(false);
    setPages([]);
    setSelected(new Set());

    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to crawl URL');
        return;
      }

      setPages(data.pages);
      setSelected(new Set(data.pages));
      setCrawled(true);
    } catch {
      setError('Failed to crawl URL. Please check the URL and try again.');
    } finally {
      setCrawling(false);
    }
  };

  const togglePage = (page: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(page)) {
        next.delete(page);
      } else {
        next.add(page);
      }
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(pages));
  const deselectAll = () => setSelected(new Set());

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    setError('');

    const sources = Array.from(selected).map((u) => ({ url: u }));
    const { error } = await setupSources(slug, sources);

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
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
        <Label htmlFor="crawl-url">Website URL</Label>
        <div className="flex gap-2">
          <Input
            id="crawl-url"
            placeholder="https://example.com/docs"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCrawl()}
          />
          <Button
            type="button"
            variant="neutral"
            onClick={handleCrawl}
            disabled={!url || crawling}
          >
            {crawling ? (
              'Finding...'
            ) : (
              <>
                <MagnifyingGlassIcon className="mr-2" />
                Find Pages
              </>
            )}
          </Button>
        </div>
      </div>

      {crawled && pages.length === 0 && (
        <p className="text-muted-foreground py-4 text-center text-sm">
          No pages found. Try a different URL.
        </p>
      )}

      {pages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {pages.length} page{pages.length !== 1 ? 's' : ''} found
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
                onClick={selectAll}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
                onClick={deselectAll}
              >
                Deselect all
              </button>
            </div>
          </div>
          <ul className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
            {pages.map((page) => (
              <li key={page}>
                <label className="bg-bg hover:translate-x-boxShadowX hover:translate-y-boxShadowY flex cursor-pointer items-center gap-3 rounded-base border-2 border-black px-3 py-2 shadow-base transition-all hover:shadow-none">
                  <input
                    type="checkbox"
                    className="accent-main size-4 shrink-0"
                    checked={selected.has(page)}
                    onChange={() => togglePage(page)}
                  />
                  <Link2Icon className="text-muted-foreground size-4 shrink-0" />
                  <span className="truncate text-sm">{page}</span>
                </label>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            disabled={selected.size === 0 || submitting}
            className="w-full"
            onClick={handleSubmit}
          >
            {submitting
              ? 'Adding...'
              : `Add ${selected.size} page${selected.size !== 1 ? 's' : ''}`}
          </Button>
        </div>
      )}
    </div>
  );
}
