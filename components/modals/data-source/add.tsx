import { useCallback } from 'react';
import { useAddDataSource } from '@/states/data-source';
import { toast } from 'sonner';

import { useIsMobile } from '@/hooks/useIsMobile';
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

import { AddDataSourceForm } from './forms';

export function AddDataSource() {
  const isMobile = useIsMobile();
  const [slug, setOpen] = useAddDataSource();

  const handleOnAdd = useCallback(() => {
    setOpen(false);
    toast.success('Successfully added new data-sources', {
      description: 'Generating embeddings for the new sources',
    });
  }, [setOpen]);

  if (isMobile) {
    return (
      <Drawer open={Boolean(open)} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add data-source to your organization</DrawerTitle>
            <DrawerDescription>
              Add your links to the docs, blogs & other help center docs
            </DrawerDescription>
          </DrawerHeader>
          <AddDataSourceForm onAdd={handleOnAdd} slug={slug as string} />
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
        <AddDataSourceForm onAdd={handleOnAdd} slug={slug as string} />
      </DialogContent>
    </Dialog>
  );
}
