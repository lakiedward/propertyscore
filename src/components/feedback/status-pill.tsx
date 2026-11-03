import { cva } from 'class-variance-authority';
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusPillVariants = cva(
  'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-meta font-bold',
  {
    variants: {
      tone: {
        warning: 'border-warning-border bg-warning-surface text-warning',
        success: 'border-success-border bg-success-surface text-success',
        info: 'border-info-border bg-info-surface text-info',
        neutral: 'border-border bg-surface-sunken text-muted-foreground',
      },
    },
  },
);

const TONE_ICON = {
  warning: CircleAlertIcon,
  success: CircleCheckIcon,
  info: InfoIcon,
  neutral: SearchIcon,
} as const;

type StatusPillProps = {
  tone: 'warning' | 'success' | 'info' | 'neutral';
  label: string;
  className?: string;
};

export function StatusPill({ tone, label, className }: StatusPillProps) {
  const Icon = TONE_ICON[tone];

  return (
    <span className={cn(statusPillVariants({ tone }), className)}>
      <Icon aria-hidden className="size-3.5" />
      {label}
    </span>
  );
}
