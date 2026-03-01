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
    <div
      className={cn('flex w-full gap-2 max-w-sm md:max-w-none', flexAlignment)}
    >
      <div className="bg-background border-[#FF4500]/20 max-w-xl overflow-hidden break-words border p-4 text-sm text-foreground">
        <div
          className="email-content"
          dangerouslySetInnerHTML={{ __html: sanitizedBody }}
        />
      </div>
      <Avatar className={cn('size-10', avatarOrder)}>
        <AvatarFallback>
          {getNameInitials(email_from_name)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
