import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_TILE_CLASS, type CategoryHue } from '../home.categories';

type CategoryChip = { key: string; label: string; icon: LucideIcon; hue?: CategoryHue };

type CategoryChipListProps = {
  label: string;
  chips: readonly CategoryChip[];
  tone?: 'category' | 'physical';
};

export function CategoryChipList({ label, chips, tone = 'category' }: CategoryChipListProps) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const Icon = chip.icon;
        return (
          <li
            key={chip.key}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-small font-bold',
              tone === 'physical'
                ? 'bg-surface-alt text-brand'
                : CATEGORY_TILE_CLASS[chip.hue ?? 'city'],
            )}
          >
            <Icon
              aria-hidden
              className={cn('size-4.5', tone === 'physical' && 'text-category-green')}
            />
            <span className={cn(tone === 'category' && 'text-foreground')}>{chip.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
