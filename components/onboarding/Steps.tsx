'use client';

import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

interface StepProps {
  index: number;
  title: string;
  current: boolean;
}

function Step({ title, current, index }: StepProps) {
  return (
    <div
      className={cn(
        'relative flex size-full flex-col items-start gap-1 p-4',
        current ? 'bg-background rounded-xl border' : ''
      )}
    >
      <p className="text-muted-foreground text-xs font-semibold uppercase">
        Step {index}
      </p>
      <h2 className="text-lg font-medium">{title}</h2>
    </div>
  );
}

export function Steps() {
  const pathname = usePathname();
  const steps = [
    { title: 'Organization creation', route: 'onboarding' },
    { title: 'Setting up email forwarding', route: 'email-forwarding' },
    { title: 'Setting up data sources', route: 'data-sources' },
    { title: 'Configurations', route: 'configurations' },
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      {steps.map((step, index) => (
        <Step
          key={index}
          index={index + 1}
          title={step.title}
          current={pathname.split('/').at(-1) === step.route}
        />
      ))}
    </div>
  );
}
