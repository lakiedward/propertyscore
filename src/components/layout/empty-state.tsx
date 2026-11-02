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
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ kind, title, description, action, className }: EmptyStateProps) {
  const { icon: Icon, role } = EMPTY_STATE_KIND[kind];

  return (
    <div
      role={role}
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface-subtle px-6 py-10 text-center',
        className,
      )}
    >
      <Icon aria-hidden className={emptyStateIconVariants({ kind })} />
      <p className="text-h4">{title}</p>
      {description ? (
        <p className="max-w-sm text-small text-muted-foreground">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
