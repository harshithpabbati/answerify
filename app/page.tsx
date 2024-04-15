import { siteConfig } from '@/lib/config';
import { Header } from '@/components/header';

export default function Home() {
  return (
    <>
      <Header />
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-5 p-4">
        <h1 className="text-center text-3xl font-bold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1]">
          {siteConfig.hero.heading}
        </h1>
        <p className="text-muted-foreground max-w-[750px] text-center text-lg sm:text-xl">
          {siteConfig.hero.description}
        </p>
      </div>
    </>
  );
}
