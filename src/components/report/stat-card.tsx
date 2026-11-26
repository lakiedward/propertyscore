import { cva } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const statCardVariants = cva('flex flex-col rounded-lg p-4', {
  variants: {
    tone: {
      light: 'gap-1.5 bg-card ring-1 ring-border-subtle',
      inverse: 'gap-1.5 bg-primary text-on-inverse',
      card: 'justify-center gap-1 rounded-xl border border-card bg-card shadow-card-soft',
    },
  },
});

const statLabelVariants = cva('text-caption', {
  variants: {
    tone: {
      light: 'text-muted-foreground',
      inverse: 'text-on-inverse-muted',
      card: 'font-bold text-muted-foreground',
    },
  },
});

const statHintVariants = cva('', {
  variants: {
    tone: {
      light: 'text-caption text-muted-foreground',
      inverse: 'text-caption text-on-inverse-muted',
      card: 'text-small text-muted-foreground',
    },
  },
});

const statValueVariants = cva('tabular-nums', {
  variants: {
    tone: {
      light: 'text-price',
      inverse: 'text-price text-cta',
      card: 'text-price-card tracking-[-0.03em]',
    },
  },
});

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'light' | 'inverse' | 'card';
  className?: string;
};

export function StatCard({ label, value, hint, tone = 'light', className }: StatCardProps) {
  return (
    <div className={cn(statCardVariants({ tone }), className)}>
      <span className={statLabelVariants({ tone })}>{label}</span>
      <span className={statValueVariants({ tone })}>{value}</span>
      {hint ? <span className={statHintVariants({ tone })}>{hint}</span> : null}
    </div>
  );
}
