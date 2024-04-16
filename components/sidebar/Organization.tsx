'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { getNameInitials } from '@/lib/gravatar';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

interface Props {
  name: string;
  slug: string;
}

export function Organization({ name, slug }: Props) {
  const pathname = usePathname();
  return (
    <Link
      href={`/org/${slug}`}
      className={cn(
        buttonVariants({
          variant: pathname === `/org/${slug}` ? 'default' : 'outline',
        }),
        'size-10 border'
      )}
    >
      {getNameInitials(name)}
    </Link>
  );
}
