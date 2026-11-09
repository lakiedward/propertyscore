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
  const isCard = variant === 'card';

  return (
    <div
      role={role}
      className={cn(
        'flex flex-col items-center rounded-xl border border-border px-6 py-10 text-center',
        isCard ? 'gap-2.5 bg-card' : 'gap-3 border-dashed bg-surface-subtle',
        className,
      )}
    >
      {isCard ? null : <Icon aria-hidden className={emptyStateIconVariants({ kind })} />}
      <p className={isCard ? 'text-[20px] font-bold tracking-[-0.02em]' : 'text-h4'}>{title}</p>
      {description ? (
        <p className={cn('max-w-sm text-muted-foreground', isCard ? 'text-caption' : 'text-small')}>
          {description}
        </p>
      ) : null}
      {action}
    </div>
  );
}
