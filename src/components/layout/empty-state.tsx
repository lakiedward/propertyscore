import { CircleAlertIcon, SearchXIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  kind: 'empty' | 'error';
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ kind, title, description, action, className }: EmptyStateProps) {
  const Icon = kind === 'error' ? CircleAlertIcon : SearchXIcon;

  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface-subtle px-6 py-10 text-center',
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn('size-8', kind === 'error' ? 'text-destructive' : 'text-muted-foreground')}
      />
      <p className="text-h4">{title}</p>
      {description ? (
        <p className="max-w-sm text-small text-muted-foreground">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
