import { Header } from '@/components/header';
import {
  Features,
  Footer,
  Hero,
  Pricing,
  Slider,
} from '@/components/marketing';

export default function Home() {
  return (
    <div className="size-full flex-1 bg-white">
      <Header isDashboard={false} />
      <Hero />
      <Features />
      <Slider />
      <Pricing />
      <Footer />
    </div>
  );
}
