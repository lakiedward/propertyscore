import { ArrowRightIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import {
  CATEGORY_GROUPS,
  type CategoryKey,
  type CategorySummary,
  type ChapterId,
} from '../online-report.utils';
import { CATEGORY_ICON, categoryClasses } from './category-style';

type CategoryBarsProps = {
  categories: Readonly<Record<CategoryKey, CategorySummary>>;
  onOpenChapter: (chapter: ChapterId) => void;
};

export function CategoryBars({ categories, onOpenChapter }: CategoryBarsProps) {
  const { t } = useTranslation('onlineReports');

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="text-h4 font-extrabold">{t('summary.allScores')}</h3>
        <span aria-hidden className="flex gap-3.5 text-meta text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-info" />
            {t('summary.legendAddress')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-0.75 rounded-xs bg-foreground" />
            {t('summary.legendCity')}
          </span>
        </span>
      </div>
      {CATEGORY_GROUPS.map((group) => (
        <div key={group.id} className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => {
              onOpenChapter(group.chapter);
            }}
            className="flex min-h-10 items-center justify-between gap-3 border-t border-border-subtle pt-2 pb-1 text-left"
          >
            <strong className="text-eyebrow font-extrabold text-muted-foreground uppercase">
              {t(`summary.group.${group.id}`)}
            </strong>
            <span className="inline-flex items-center gap-1 text-caption font-bold text-brand">
              {t('summary.seeChapter')}
              <ArrowRightIcon aria-hidden className="size-3.5" />
            </span>
          </button>
          {group.keys.map((key) => (
            <CategoryBar key={key} categoryKey={key} summary={categories[key]} />
          ))}
        </div>
      ))}
      <p className="text-caption text-muted-foreground">{t('summary.footnote')}</p>
    </div>
  );
}

type CategoryBarProps = {
  categoryKey: CategoryKey;
  summary: CategorySummary;
};

function CategoryBar({ categoryKey, summary }: CategoryBarProps) {
  const { t } = useTranslation('onlineReports');
  const Icon = CATEGORY_ICON[categoryKey];
  const hue = categoryClasses(categoryKey);
  const name = t(`category.${categoryKey}`);
  const { score, city_avg: average } = summary;

  const label =
    score === null
      ? t('summary.barMissing', { name })
      : average === null
        ? t('summary.barLabelNoAverage', { name, score })
        : t('summary.barLabel', { name, score, average });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-x-3.5 gap-y-1.5 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_2.5rem]">
      <span className="flex min-w-0 items-center gap-2.5">
        <span className={cn('grid size-7.5 flex-none place-items-center rounded-md', hue.tile)}>
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="min-w-0 text-body-sm font-semibold">{name}</span>
      </span>
      <span
        role="img"
        aria-label={label}
        className={cn(
          'relative col-span-2 row-start-2 h-2 rounded-full sm:col-span-1 sm:col-start-2 sm:row-start-1',
          score === null ? 'border border-dashed border-trust-none-border' : hue.track,
        )}
      >
        {score === null ? null : (
          <span
            className={cn('absolute inset-y-0 left-0 rounded-full', hue.fill)}
            style={{ width: `${String(score)}%` } satisfies CSSProperties}
          />
        )}
        {average === null || score === null ? null : (
          <span
            className="absolute -inset-y-1 -ml-px w-0.75 rounded-xs bg-foreground"
            style={{ left: `${String(average)}%` } satisfies CSSProperties}
          />
        )}
      </span>
      <strong
        aria-hidden
        className={cn(
          'text-right text-title-xs font-extrabold tabular-nums',
          score === null ? 'text-data-missing' : hue.ink,
        )}
      >
        {score === null ? '–' : formatNumber(score)}
      </strong>
    </div>
  );
}
