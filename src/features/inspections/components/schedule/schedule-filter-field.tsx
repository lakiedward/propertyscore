import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ScheduleFilterFieldProps = {
  label: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
};

export function ScheduleFilterField({
  label,
  htmlFor,
  className,
  children,
}: ScheduleFilterFieldProps) {
  const labelClass = 'text-meta font-bold tracking-label text-muted-foreground uppercase';

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
      ) : (
        <span aria-hidden className={labelClass}>
          {label}
        </span>
      )}
      {children}
    </div>
  );
}
