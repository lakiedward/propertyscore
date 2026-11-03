import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { CategoryKey } from '../online-report.utils';
import { categoryClasses } from './category-style';

export type PlaceListItem = {
  id: string;
  title: string;
  trailing: string;
  details: readonly string[];
};

type PlaceListProps = {
  labelledBy: string;
  hueKey: CategoryKey;
  items: readonly PlaceListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function PlaceList({ labelledBy, hueKey, items, selectedId, onSelect }: PlaceListProps) {
  const hue = categoryClasses(hueKey);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    if (selectedId === null) return;
    itemRefs.current.get(selectedId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  return (
    <ol aria-labelledby={labelledBy} className="flex flex-col gap-2">
      {items.map((item, index) => {
        const isSelected = item.id === selectedId;
        return (
          <li
            key={item.id}
            ref={(element) => {
              if (element) itemRefs.current.set(item.id, element);
              else itemRefs.current.delete(item.id);
            }}
          >
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                onSelect(item.id);
              }}
              className={cn(
                'flex w-full items-start gap-3 rounded-lg border p-3.5 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                isSelected
                  ? cn(hue.border, hue.track)
                  : 'border-border bg-card hover:bg-surface-sunken',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full text-meta font-extrabold tabular-nums',
                  isSelected ? cn(hue.fill, 'text-on-inverse') : hue.tile,
                )}
              >
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="font-bold">{item.title}</span>
                  <span className="text-small font-bold tabular-nums">{item.trailing}</span>
                </span>
                {item.details.length > 0 ? (
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground">
                    {item.details.map((detail) => (
                      <span key={detail}>{detail}</span>
                    ))}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
