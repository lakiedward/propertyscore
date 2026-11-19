import { cva } from 'class-variance-authority';
import { CircleAlertIcon, SearchXIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const emptyStateIconVariants = cva('size-8', {
  variants: {
    kind: {
      empty: 'text-muted-foreground',
      error: 'text-destructive',
    },
  },
});

const emptyStateVariants = cva(
  'flex flex-col items-center rounded-xl border px-6 py-10 text-center',
  {
    variants: {
      variant: {
        default: 'gap-3 border-dashed border-border bg-surface-subtle',
        card: 'gap-2.5 border-card bg-card shadow-card-soft',
      },
    },
  },
);

const emptyStateTitleVariants = cva('', {
  variants: {
    variant: {
      default: 'text-h4',
      card: 'text-[20px] font-bold tracking-snug-title',
    },
  },
});

const emptyStateDescriptionVariants = cva('max-w-sm text-muted-foreground', {
  variants: {
    variant: {
      default: 'text-small',
      card: 'text-caption',
    },
  },
});

type EmptyStateKind = 'empty' | 'error';

const EMPTY_STATE_KIND = {
  empty: { icon: SearchXIcon, role: 'status' },
  error: { icon: CircleAlertIcon, role: 'alert' },
} as const satisfies Record<EmptyStateKind, { icon: typeof SearchXIcon; role: string }>;

type EmptyStateProps = {
  kind: EmptyStateKind;
  variant?: 'default' | 'card';
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  kind,
  variant = 'default',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const { icon: Icon, role } = EMPTY_STATE_KIND[kind];

  return (
    <div role={role} className={cn(emptyStateVariants({ variant }), className)}>
      {variant === 'card' ? null : (
        <Icon aria-hidden className={emptyStateIconVariants({ kind })} />
      )}
      <p className={emptyStateTitleVariants({ variant })}>{title}</p>
      {description ? (
        <p className={emptyStateDescriptionVariants({ variant })}>{description}</p>
      ) : null}
      {action}
    </div>
  );
}
