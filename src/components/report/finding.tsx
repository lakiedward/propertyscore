import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type FindingProps = {
  reference: string;
  title: string;
  status: ReactNode;
  fields: readonly { key: string; label: string; value: string }[];
  className?: string;
};

export function Finding({ reference, title, status, fields, className }: FindingProps) {
  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-border-subtle',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-meta font-bold text-muted-foreground uppercase">{reference}</span>
        {status}
      </div>
      <h4 className="text-h3">{title}</h4>
      <dl className="flex flex-col divide-y divide-border-subtle">
        {fields.map((field) => (
          <div key={field.key} className="grid gap-1 py-3 lg:grid-cols-[8rem_1fr] lg:gap-4">
            <dt className="text-caption font-bold text-muted-foreground">{field.label}</dt>
            <dd className="text-small">{field.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
