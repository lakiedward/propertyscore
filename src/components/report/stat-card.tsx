import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'light' | 'inverse';
  className?: string;
};

export function StatCard({ label, value, hint, tone = 'light', className }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-lg p-4',
        tone === 'inverse' ? 'bg-primary text-on-inverse' : 'bg-card ring-1 ring-border-subtle',
        className,
      )}
    >
      <span
        className={cn(
          'text-caption',
          tone === 'inverse' ? 'text-on-inverse-muted' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
      <span className={cn('text-price tabular-nums', tone === 'inverse' && 'text-cta')}>
        {value}
      </span>
      {hint ? (
        <span
          className={cn(
            'text-caption',
            tone === 'inverse' ? 'text-on-inverse-muted' : 'text-muted-foreground',
          )}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}
