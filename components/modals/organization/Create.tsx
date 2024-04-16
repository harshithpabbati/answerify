import { useCreateOrganization } from '@/states/organization';

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

import { CreateOrganizationForm } from './forms/Create';

export function CreateOrganization() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useCreateOrganization();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Set up your organization</DrawerTitle>
            <DrawerDescription>
              Tell us about your organization
            </DrawerDescription>
          </DrawerHeader>
          <CreateOrganizationForm />
        </DrawerContent>
        <DrawerFooter>
          <DrawerClose />
        </DrawerFooter>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set up your organization</DialogTitle>
          <DialogDescription>Tell us about your organization</DialogDescription>
        </DialogHeader>
        <CreateOrganizationForm />
      </DialogContent>
    </Dialog>
  );
}
