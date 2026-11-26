import type { ReactNode } from 'react';

type EmptyStateProps = {
  kind?: 'empty' | 'error';
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ kind = 'empty', title, description, action }: EmptyStateProps) {
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className="flex flex-col items-center gap-2.5 rounded-xl border border-card bg-card px-6 py-10 text-center shadow-card-soft"
    >
      <p className="text-title-2xs font-bold tracking-snug-title">{title}</p>
      {description ? (
        <p className="max-w-sm text-caption text-muted-foreground">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
