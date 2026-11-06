import { cva } from 'class-variance-authority';
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleXIcon,
  InfoIcon,
  SearchIcon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusPillVariants = cva('inline-flex w-fit items-center font-bold', {
  variants: {
    tone: {
      warning: 'border-warning-border bg-warning-surface text-warning',
      success: 'border-success-border bg-success-surface text-success',
      info: 'border-info-border bg-info-surface text-info',
      error: 'border-error-border bg-error-surface text-destructive',
      neutral: 'border-border bg-surface-sunken text-muted-foreground',
    },
    shape: {
      pill: 'gap-1.5 rounded-full border px-2.5 py-1 text-meta',
      tag: 'min-h-6 gap-1 rounded-sm px-2.25 py-0.5 text-status',
    },
  },
  defaultVariants: { shape: 'pill' },
});

type StatusPillTone = 'warning' | 'success' | 'info' | 'error' | 'neutral';

const TONE_ICON = {
  warning: CircleAlertIcon,
  success: CircleCheckIcon,
  info: InfoIcon,
  error: CircleXIcon,
  neutral: SearchIcon,
} as const satisfies Record<StatusPillTone, LucideIcon>;

type StatusPillProps = {
  tone: StatusPillTone;
  label: string;
  icon?: LucideIcon;
  shape?: 'pill' | 'tag';
  className?: string;
};

export function StatusPill({ tone, label, icon, shape = 'pill', className }: StatusPillProps) {
  const Icon = icon ?? TONE_ICON[tone];

  return (
    <span className={cn(statusPillVariants({ tone, shape }), className)}>
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {label}
    </span>
  );
}
