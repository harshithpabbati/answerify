import Link from 'next/link';

import { siteConfig } from '@/lib/config';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export function Hero() {
  return (
    <div className="relative flex h-[80dvh] flex-col items-center justify-center gap-5 overflow-hidden bg-grid bg-[size:70px_70px] p-4 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.12)_0%,transparent_70%)]" />
      <h1 className="font-heading relative text-center text-3xl md:text-4xl lg:text-5xl">
        {siteConfig.hero.heading}
      </h1>
      <p className="max-w-4xl text-center text-lg font-normal leading-relaxed text-muted-foreground md:text-xl lg:text-2xl lg:leading-relaxed">
        {siteConfig.hero.description}
      </p>
      <Link
        href="/auth/sign-up"
        className={cn(
          'font-heading h-12 text-base md:text-lg lg:h-14 lg:text-xl',
          buttonVariants({ size: 'lg' })
        )}
      >
        Get started
      </Link>
    </div>
  );
}
