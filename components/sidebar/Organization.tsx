'use client';

import { useParams, useRouter } from 'next/navigation';
import { deleteOrganization } from '@/actions/organization';
import { Tables } from '@/database.types';
import { useAddDataSource } from '@/states/data-source';
import { useUpdateOrganization } from '@/states/organization';
import {
  FilePlusIcon,
  Pencil1Icon,
  PersonIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { toast } from 'sonner';

import { getNameInitials } from '@/lib/gravatar';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

export function Organization({ id, name, slug }: Tables<'organization'>) {
  const router = useRouter();
  const params = useParams();
  const [, setUpdateOrganization] = useUpdateOrganization();
  const [, setAddDataSource] = useAddDataSource();

  const handleDelete = async () => {
    const { error } = await deleteOrganization(id);
    if (error) {
      toast.error('Organization Deletion Failed', {
        description:
          'We are unable to delete the organization at this time. Please try again later',
      });
    }
    toast.success('Successfully deleted your organization', {
      description: 'Please wait while we redirect you to dashboard',
    });
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Button
          variant={params.slug === slug ? 'default' : 'outline'}
          className="size-10"
          onClick={() => router.push(`/org/${slug}`)}
        >
          {getNameInitials(name)}
        </Button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52" forceMount>
        <ContextMenuLabel>
          <div className="flex flex-col items-start space-y-1">
            <p className="text-sm font-medium leading-none">{name}</p>
            <p className="text-muted-foreground text-xs leading-none">{slug}</p>
          </div>
        </ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => setUpdateOrganization(id)}>
          Edit
          <ContextMenuShortcut>
            <Pencil1Icon />
          </ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => setAddDataSource(slug)}>
          Add data-source
          <ContextMenuShortcut>
            <FilePlusIcon />
          </ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          Invite members
          <ContextMenuShortcut>
            <PersonIcon />
          </ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive" onSelect={handleDelete}>
          Delete
          <ContextMenuShortcut>
            <TrashIcon />
          </ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
