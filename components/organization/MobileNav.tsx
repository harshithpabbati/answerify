'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  EnvelopeClosedIcon,
  GearIcon,
  LightningBoltIcon,
  MixIcon,
} from '@radix-ui/react-icons';

import { cn } from '@/lib/utils';

interface Props {
  slug: string;
}

export function MobileNav({ slug }: Props) {
  const pathname = usePathname();

  const navItems = [
    {
      href: `/org/${slug}`,
      icon: EnvelopeClosedIcon,
      label: 'Inbox',
      active:
        pathname.startsWith(`/org/${slug}`) &&
        !pathname.includes('/workflows') &&
        !pathname.includes('/sandbox') &&
        !pathname.includes('/admin'),
    },
    {
      href: `/org/${slug}/workflows`,
      icon: LightningBoltIcon,
      label: 'Workflows',
      active: pathname.includes('/workflows'),
    },
    {
      href: `/org/${slug}/sandbox`,
      icon: MixIcon,
      label: 'Sandbox',
      active: pathname.includes('/sandbox'),
    },
    {
      href: `/org/${slug}/admin`,
      icon: GearIcon,
      label: 'Admin',
      active: pathname.includes('/admin'),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#FF4500]/20 bg-background md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map(({ href, icon: Icon, label, active }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex h-full flex-1 flex-col items-center justify-center gap-1 font-mono text-[10px] uppercase tracking-wider transition-colors',
              active
                ? 'text-[#FF4500]'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="size-5" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
