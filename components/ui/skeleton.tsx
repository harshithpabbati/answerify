import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-base bg-primary/10 animate-pulse', className)}
      {...props}
    />
  );
}

export { Skeleton };
