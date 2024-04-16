import { getUser } from '@/actions/auth';
import { ExitIcon, PlusIcon } from '@radix-ui/react-icons';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export async function User() {
  const {
    data: { user },
  } = await getUser();
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-2">
      <Button variant="ghost">
        <PlusIcon className="size-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="size-9 rounded-full">
            <Avatar className="size-9">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback>{user?.user_metadata?.fallback}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start" forceMount>
          <DropdownMenuLabel>
            <div className="flex flex-col items-start space-y-1">
              <p className="text-sm font-medium leading-none">
                {user?.user_metadata?.full_name}
              </p>
              <p className="text-muted-foreground text-xs leading-none">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <ExitIcon className="mr-2 size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
