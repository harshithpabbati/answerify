import { CheckIcon } from '@radix-ui/react-icons';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function PricingPlan({
  perks,
  mostPopular = false,
  planName,
  description,
  price,
}: {
  perks: string[];
  mostPopular?: boolean;
  planName: string;
  description: string;
  price: string;
}) {
  return (
    <div className="rounded-base flex flex-col justify-between border-2 border-black bg-white p-5">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-2xl">{planName}</h3>
          {mostPopular && (
            <span className="rounded-base bg-main border-2 border-black px-2 py-0.5 text-sm">
              Most popular
            </span>
          )}
        </div>
        <p className="mb-3 mt-1">{description}</p>
        <div>
          <span className="font-heading text-3xl">${price}</span>{' '}
          <span>/month</span>{' '}
        </div>
        <ul className="mt-8 flex flex-col gap-2">
          {perks.map((perk) => {
            return (
              <li key={perk} className="flex items-center gap-3">
                <CheckIcon className="shrink-0" /> {perk}
              </li>
            );
          })}
        </ul>
      </div>
      <Button
        size={mostPopular ? 'lg' : 'default'}
        className={cn('mt-12 w-full', mostPopular && 'bg-black text-white')}
      >
        Buy Plan
      </Button>
    </div>
  );
}

export function Pricing() {
  return (
    <section className="font-base bg-grid inset-0 flex w-full flex-col items-center justify-center border-b-2 border-b-black bg-[size:70px_70px]">
      <div className="container mx-auto px-5 py-20 lg:py-[100px]">
        <h2 className="font-heading mb-14 text-center text-2xl md:text-3xl lg:mb-20 lg:text-4xl">
          Pricing
        </h2>
        <div className="w900:grid-cols-1 w900:w-2/3 w900:mx-auto w500:w-full grid grid-cols-3 gap-8">
          <PricingPlan
            planName="Basic"
            description="Ideal for small organizations or individuals."
            price="10"
            perks={[
              '1 organization',
              'Up to 1,000 responses',
              '5 data sources',
              '48-hour support response time',
            ]}
          />
          <PricingPlan
            planName="Essential"
            description="Best suited for medium-sized organizations with higher data and support needs."
            price="25"
            perks={[
              '5 organizations',
              'Up to 10,000 responses',
              '20 data sources',
              '24-hour support response time',
              '2 custom workflows',
            ]}
            mostPopular
          />
          <PricingPlan
            planName="Growth"
            description="Designed for large organizations requiring extensive data handling and rapid support."
            price="50"
            perks={[
              'Unlimited organizations',
              'Unlimited responses',
              'Unlimited data sources',
              '6-hour, dedicated support response time',
              'Unlimited custom workflows',
            ]}
          />
        </div>
      </div>
    </section>
  );
}
