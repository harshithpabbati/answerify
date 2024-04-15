import { siteConfig } from '@/lib/config';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5">
      <h1 className="text-center text-3xl font-bold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1]">
        {siteConfig.hero.heading}
      </h1>
      <p className="text-muted-foreground max-w-[750px] text-center text-lg sm:text-xl">
        {siteConfig.hero.description}
      </p>
    </main>
  );
}
