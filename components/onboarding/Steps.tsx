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
        'relative flex size-full flex-col items-start gap-1 p-4 transition-colors',
        current
          ? 'border border-[#FF4500] bg-[#FF4500]/10'
          : 'border border-transparent'
      )}
    >
      <p className={cn('font-mono text-xs font-semibold uppercase tracking-widest', current ? 'text-[#FF4500]' : 'text-gray-600')}>
        Step {index}
      </p>
      <h2 className={cn('font-display text-lg font-black uppercase tracking-tight', current ? 'text-foreground' : 'text-gray-600')}>{title}</h2>
    </div>
  );
}

export function Steps() {
  const pathname = usePathname();
  const steps = [
    { title: 'Create organization', route: 'onboarding' },
    { title: 'Setup email forwarding', route: 'email-forwarding' },
    { title: 'Setup data sources', route: 'data-sources' },
    { title: 'Configurations', route: 'configurations' },
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      {steps.map((step, index) => (
        <Step
          key={step.route}
          index={index + 1}
          title={step.title}
          current={pathname.split('/').at(-1) === step.route}
        />
      ))}
    </div>
  );
}
