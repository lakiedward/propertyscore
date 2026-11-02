import { cva } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const statCardVariants = cva('flex flex-col gap-1.5 rounded-lg p-4', {
  variants: {
    tone: {
      light: 'bg-card ring-1 ring-border-subtle',
      inverse: 'bg-primary text-on-inverse',
    },
  },
});

const statTextVariants = cva('text-caption', {
  variants: {
    tone: {
      light: 'text-muted-foreground',
      inverse: 'text-on-inverse-muted',
    },
  },
});

const statValueVariants = cva('text-price tabular-nums', {
  variants: {
    tone: {
      light: '',
      inverse: 'text-cta',
    },
  },
});

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'light' | 'inverse';
  className?: string;
};

export function StatCard({ label, value, hint, tone = 'light', className }: StatCardProps) {
  return (
    <div className={cn(statCardVariants({ tone }), className)}>
      <span className={statTextVariants({ tone })}>{label}</span>
      <span className={statValueVariants({ tone })}>{value}</span>
      {hint ? <span className={statTextVariants({ tone })}>{hint}</span> : null}
    </div>
  );
}
