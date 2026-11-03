import { cn } from '@/lib/utils';

type ChapterFact = {
  key: string;
  value: string;
  label: string;
};

type ChapterFactsProps = {
  facts: readonly ChapterFact[];
  toneClassName: string;
};

export function ChapterFacts({ facts, toneClassName }: ChapterFactsProps) {
  return (
    <dl className="grid gap-2.5 sm:grid-cols-3">
      {facts.map((fact, index) => (
        <div
          key={fact.key}
          className={cn(
            'flex flex-col-reverse gap-1 rounded-lg p-4',
            index === 0 ? toneClassName : 'bg-surface-sunken',
          )}
        >
          <dt className="text-small text-foreground">{fact.label}</dt>
          <dd className="text-title-sm leading-tight font-extrabold tracking-[-0.025em] tabular-nums">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
