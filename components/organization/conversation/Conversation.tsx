import { Tables } from '@/database.types';

import { getNameInitials } from '@/lib/gravatar';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function Conversation({ email_from_name, body, role }: Tables<'email'>) {
  const isStaff = role === 'staff';
  const flexAlignment = isStaff ? 'justify-end' : 'justify-start';
  const avatarOrder = isStaff ? 'order-1' : '-order-1';
  const borderRadiusClass = isStaff ? 'rounded-tr-none' : 'rounded-tl-none';

  return (
    <div className={cn('flex w-full gap-2', flexAlignment)}>
      <div
        className={cn(
          'bg-background max-w-[60dvw] overflow-scroll rounded-lg p-4 text-sm',
          borderRadiusClass
        )}
      >
        <div
          className="email-content"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </div>
      <Avatar className={cn('size-10 border', avatarOrder)}>
        <AvatarFallback className="bg-background">
          {getNameInitials(email_from_name)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
