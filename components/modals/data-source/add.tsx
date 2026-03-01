'use client';

import { useCallback, useState } from 'react';
import { useAddDataSource } from '@/states/data-source';
import { toast } from 'sonner';

import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
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

import { AddDataSourceForm, DomainImportForm } from './forms';

type Tab = 'manual' | 'domain';

function TabBar({ active, onChange }: { active: Tab; onChange(t: Tab): void }) {
  return (
    <div className="flex gap-1 rounded border p-1 text-sm">
      {(['manual', 'domain'] as Tab[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={cn(
            'flex-1 rounded px-3 py-1 transition-colors',
            active === t
              ? 'bg-foreground text-background font-medium'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t === 'manual' ? 'Add URLs' : 'Import from domain'}
        </button>
      ))}
    </div>
  );
}

function DataSourceContent({
  slug,
  onAdd,
}: {
  slug: string;
  onAdd(): void;
}) {
  const [tab, setTab] = useState<Tab>('manual');

  return (
    <div className="space-y-4">
      <TabBar active={tab} onChange={setTab} />
      {tab === 'manual' ? (
        <AddDataSourceForm slug={slug} onAdd={onAdd} />
      ) : (
        <DomainImportForm slug={slug} onAdd={onAdd} />
      )}
    </div>
  );
}

export function AddDataSource() {
  const isMobile = useIsMobile();
  const [slug, setOpen] = useAddDataSource();

  const handleOnAdd = useCallback(() => {
    setOpen(false);
    toast.success('Successfully added new data-sources', {
      description: 'Processing the new sources',
    });
  }, [setOpen]);

  if (isMobile) {
    return (
      <Drawer open={Boolean(slug)} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add data-source to your organization</DrawerTitle>
            <DrawerDescription>
              Add your links to the docs, blogs & other help center docs
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <DataSourceContent slug={slug as string} onAdd={handleOnAdd} />
          </div>
        </DrawerContent>
        <DrawerFooter>
          <DrawerClose />
        </DrawerFooter>
      </Drawer>
    );
  }

  return (
    <Dialog open={Boolean(slug)} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add data-source to your organization</DialogTitle>
          <DialogDescription>
            Add your links to the docs, blogs & other help center docs
          </DialogDescription>
        </DialogHeader>
        <DataSourceContent slug={slug as string} onAdd={handleOnAdd} />
      </DialogContent>
    </Dialog>
  );
}
