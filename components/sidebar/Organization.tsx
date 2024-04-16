'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Pencil1Icon, PersonIcon, TrashIcon } from '@radix-ui/react-icons';

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

interface Props {
  name: string;
  slug: string;
}

export function Organization({ name, slug }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Button
          variant={pathname === `/org/${slug}` ? 'default' : 'outline'}
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
        <ContextMenuItem>
          Edit
          <ContextMenuShortcut>
            <Pencil1Icon />
          </ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          Invite members
          <ContextMenuShortcut>
            <PersonIcon />
          </ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive">
          Delete
          <ContextMenuShortcut>
            <TrashIcon />
          </ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
