import { useUpdateOrganization } from '@/states/organization';

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

import { UpdateOrganizationForm } from './forms/Update';

export function UpdateOrganization() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useUpdateOrganization();

  if (isMobile) {
    return (
      <Drawer open={Boolean(open)} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Update your organization</DrawerTitle>
            <DrawerDescription>
              Update the details of your organization
            </DrawerDescription>
          </DrawerHeader>
          <UpdateOrganizationForm />
        </DrawerContent>
        <DrawerFooter>
          <DrawerClose />
        </DrawerFooter>
      </Drawer>
    );
  }

  return (
    <Dialog open={Boolean(open)} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update your organization</DialogTitle>
          <DialogDescription>
            Update the details of your organization
          </DialogDescription>
        </DialogHeader>
        <UpdateOrganizationForm />
      </DialogContent>
    </Dialog>
  );
}
