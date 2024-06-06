import Link from 'next/link';

import { siteConfig } from '@/lib/config';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export function Hero() {
  return (
    <div className="bg-grid flex h-[80dvh] flex-col items-center justify-center gap-5 bg-[size:70px_70px] p-4">
      <h1 className="font-heading text-center text-3xl md:text-4xl lg:text-5xl">
        {siteConfig.hero.heading}
      </h1>
      <p className="max-w-4xl text-center text-lg font-normal leading-relaxed md:text-xl lg:text-2xl lg:leading-relaxed">
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
