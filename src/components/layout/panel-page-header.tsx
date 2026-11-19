import type { ReactNode } from 'react';

type PanelPageHeaderProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
};

export function PanelPageHeader({ eyebrow, title, description, actions }: PanelPageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow ? (
          <p className="text-eyebrow leading-copy font-bold tracking-eyebrow text-muted-foreground uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-h2 leading-heading text-foreground">{title}</h1>
        {description ? <p className="text-small text-muted-foreground">{description}</p> : null}
      </div>
      {actions}
    </header>
  );
}
