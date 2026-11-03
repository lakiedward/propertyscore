import type { ReactNode } from 'react';

type ChapterPanelProps = {
  id: string;
  title: string;
  lead?: string | undefined;
  children: ReactNode;
};

export function ChapterPanel({ id, title, lead, children }: ChapterPanelProps) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h3 id={id} className="text-h4">
          {title}
        </h3>
        {lead ? <p className="text-small text-muted-foreground">{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}
