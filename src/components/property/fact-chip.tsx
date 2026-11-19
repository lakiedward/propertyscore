import { cva } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const factChipVariants = cva('inline-flex items-center rounded-full text-foreground', {
  variants: {
    size: {
      md: 'min-h-8 gap-1.5 bg-background px-3 text-small',
      lg: 'min-h-11 gap-2 bg-surface-alt px-4 text-body font-semibold',
    },
  },
  defaultVariants: { size: 'md' },
});

const factIconVariants = cva('shrink-0', {
  variants: {
    size: {
      md: 'size-4 text-muted-foreground',
      lg: 'size-5 text-brand',
    },
  },
  defaultVariants: { size: 'md' },
});

type FactChipProps = {
  icon: LucideIcon;
  label: string;
  size?: 'md' | 'lg';
  className?: string;
};

export function FactChip({ icon: Icon, label, size, className }: FactChipProps) {
  return (
    <span className={cn(factChipVariants({ size }), className)}>
      <Icon aria-hidden className={factIconVariants({ size })} />
      {label}
    </span>
  );
}
