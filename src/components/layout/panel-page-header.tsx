import type { ReactNode } from 'react';

type PanelPageHeaderProps = {
  description?: string;
  actions?: ReactNode;
};

export function PanelPageHeader({ description, actions }: PanelPageHeaderProps) {
  if (!description && !actions) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {description ? (
        <p className="min-w-0 text-small text-muted-foreground">{description}</p>
      ) : null}
      {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
