'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addApiConnection,
  deleteApiConnection,
  getApiConnections,
} from '@/actions/api-connection';
import { Tables } from '@/database.types';
import { useManageApiConnections } from '@/states/api-connection';
import { TrashIcon } from '@radix-ui/react-icons';
import { toast } from 'sonner';

import { useIsMobile } from '@/hooks/useIsMobile';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

function ApiConnectionContent({
  orgId,
  slug,
}: {
  orgId: string;
  slug: string;
}) {
  const [connections, setConnections] = useState<
    Tables<'api_connection'>[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [description, setDescription] = useState('');

  const refreshConnections = useCallback(() => {
    getApiConnections(orgId).then(({ data }) => {
      setConnections(data ?? []);
      setLoading(false);
    });
  }, [orgId]);

  useEffect(() => {
    getApiConnections(orgId).then(({ data }) => {
      setConnections(data ?? []);
      setLoading(false);
    });
  }, [orgId]);

  const handleAdd = async () => {
    if (!name.trim() || !baseUrl.trim() || !apiKey.trim()) return;
    setSaving(true);
    const { error } = await addApiConnection(
      orgId,
      {
        name: name.trim(),
        base_url: baseUrl.trim(),
        api_key: apiKey.trim(),
        description: description.trim(),
      },
      slug
    );
    setSaving(false);
    if (error) {
      toast.error('Failed to add API connection', {
        description: error.message,
      });
      return;
    }
    setName('');
    setBaseUrl('');
    setApiKey('');
    setDescription('');
    toast.success('API connection added');
    refreshConnections();
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteApiConnection(id, slug);
    if (error) {
      toast.error('Failed to remove API connection', {
        description: error.message,
      });
      return;
    }
    toast.success('API connection removed');
    setConnections((prev) => prev.filter((c) => c.id !== id));
  };

  const inputClass =
    'w-full border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF4500]';

  return (
    <div className="space-y-6 p-4">
      {/* Existing connections */}
      {loading ? (
        <p className="font-mono text-sm text-muted-foreground">Loading…</p>
      ) : connections.length === 0 ? (
        <p className="font-mono text-sm text-muted-foreground">
          No API connections yet. Add one below.
        </p>
      ) : (
        <ul className="space-y-2">
          {connections.map((conn) => (
            <li
              key={conn.id}
              className="flex items-start justify-between gap-3 border border-[#FF4500]/20 bg-muted px-3 py-2"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold text-foreground">
                  {conn.name}
                </p>
                <p className="font-mono text-xs text-muted-foreground truncate">
                  {conn.base_url}
                </p>
                {conn.description && (
                  <p className="font-mono text-xs text-gray-500 mt-0.5">
                    {conn.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDelete(conn.id)}
                className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                aria-label={`Remove ${conn.name}`}
              >
                <TrashIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add new connection form */}
      <div className="space-y-3 border-t border-border pt-4">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#FF4500]">
          {'// Add new connection'}
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (e.g. Stripe, My CRM)"
          className={inputClass}
        />
        <input
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="Base URL (e.g. https://api.stripe.com/v1)"
          className={inputClass}
        />
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="API Key / Bearer Token"
          className={inputClass}
        />
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description — what data does this API provide? (e.g. Customer invoices and billing info)"
          className={`${inputClass} resize-y`}
        />
        <Button
          onClick={handleAdd}
          disabled={
            saving || !name.trim() || !baseUrl.trim() || !apiKey.trim()
          }
          className="w-full"
        >
          {saving ? 'Adding…' : 'Add API Connection'}
        </Button>
      </div>
    </div>
  );
}

export function ManageApiConnections() {
  const isMobile = useIsMobile();
  const [state, setState] = useManageApiConnections();

  const orgId = state ? state.orgId : '';
  const slug = state ? state.slug : '';

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) setState(false);
    },
    [setState]
  );

  if (isMobile) {
    return (
      <Drawer open={Boolean(state)} onOpenChange={handleOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>🔌 API Connections</DrawerTitle>
            <DrawerDescription>
              Connect external APIs so Answerify can fetch live customer data
              when generating replies.
            </DrawerDescription>
          </DrawerHeader>
          <ApiConnectionContent orgId={orgId} slug={slug} />
          <DrawerFooter>
            <DrawerClose />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={Boolean(state)} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>🔌 API Connections</DialogTitle>
          <DialogDescription>
            Connect external APIs so Answerify can fetch live customer data when
            generating replies.
          </DialogDescription>
        </DialogHeader>
        <ApiConnectionContent orgId={orgId} slug={slug} />
      </DialogContent>
    </Dialog>
  );
}
