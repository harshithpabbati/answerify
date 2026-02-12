import { Tables } from '@/database.types';
import DOMPurify from 'isomorphic-dompurify';

import { getNameInitials } from '@/lib/gravatar';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function Conversation({ email_from_name, body, role }: Tables<'email'>) {
  const isStaff = role === 'staff';
  const flexAlignment = isStaff ? 'justify-end' : 'justify-start';
  const avatarOrder = isStaff ? 'order-1' : '-order-1';

  // Sanitize HTML to prevent XSS attacks
  const sanitizedBody = DOMPurify.sanitize(body, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'a',
      'blockquote',
      'code',
      'pre',
      'div',
      'span',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });

  return (
    <div className={cn('flex w-full gap-2', flexAlignment)}>
      <div className="bg-background rounded-base max-w-xl overflow-scroll border p-4 text-sm">
        <div
          className="email-content"
          dangerouslySetInnerHTML={{ __html: sanitizedBody }}
        />
      </div>
      <Avatar className={cn('size-10', avatarOrder)}>
        <AvatarFallback className="bg-background">
          {getNameInitials(email_from_name)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
