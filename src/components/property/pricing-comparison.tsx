import { CheckIcon, MinusIcon, XIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ComparisonValue = 'yes' | 'no' | 'partial';

type PricingComparisonProps = {
  caption: string;
  featureHeader: string;
  columns: readonly { key: string; header: ReactNode; tone: 'physical' | 'online' }[];
  rows: readonly {
    key: string;
    label: string;
    cells: readonly { value: ComparisonValue; text: string }[];
  }[];
  valueLabels: Readonly<Record<ComparisonValue, string>>;
};

const VALUE_ICON = { yes: CheckIcon, no: XIcon, partial: MinusIcon } as const;

export function PricingComparison({
  caption,
  featureHeader,
  columns,
  rows,
  valueLabels,
}: PricingComparisonProps) {
  return (
    <div>
      <table className="w-full border-separate border-spacing-x-3 border-spacing-y-0 text-left md:-mx-3 md:w-[calc(100%+1.5rem)]">
        <caption className="sr-only">{caption}</caption>
        <thead className="hidden md:table-header-group">
          <tr>
            <th
              scope="col"
              className="w-[27%] py-3.5 align-bottom text-body font-extrabold tracking-[0.06em] text-muted-foreground uppercase"
            >
              {featureHeader}
            </th>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'rounded-t-lg p-4',
                  column.tone === 'physical' ? 'bg-surface-physical-col' : 'bg-info-surface',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className="grid grid-cols-2 border-t border-border-subtle md:table-row [&:last-child>td]:rounded-b-lg"
            >
              <th
                scope="row"
                className="col-span-2 border-border-subtle px-4 pt-4 text-label font-extrabold text-brand md:border-t md:px-0 md:py-4 md:align-top"
              >
                {row.label}
              </th>
              {row.cells.map((cell, index) => {
                const Icon = VALUE_ICON[cell.value];
                const column = columns[index];
                return (
                  <td
                    key={column?.key ?? index}
                    className={cn(
                      'p-4 align-top text-label leading-[1.4] font-normal text-muted-foreground',
                      column?.tone === 'physical' ? 'bg-surface-physical-col' : 'bg-info-surface',
                    )}
                  >
                    <span className="mb-1 block text-meta font-bold text-muted-foreground md:hidden">
                      {column?.header}
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'grid size-7.5 shrink-0 place-items-center rounded-full',
                          cell.value === 'yes' && 'bg-primary text-cta',
                          cell.value === 'no' && 'bg-surface-sunken text-muted-foreground',
                          cell.value === 'partial' && 'bg-warning-surface text-warning',
                        )}
                      >
                        <Icon aria-hidden className="size-4" strokeWidth={3} />
                      </span>
                      <span>
                        <span className="sr-only">{valueLabels[cell.value]}: </span>
                        {cell.text}
                      </span>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
