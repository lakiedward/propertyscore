import { ThumbsUpIcon, TriangleAlertIcon, type LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPercent } from '@/i18n/format';
import { cn } from '@/lib/utils';
import {
  bestAndWorst,
  chapterOfCategory,
  reportHighlights,
  scoredCategories,
  type CategoryKey,
  type CategorySummary,
  type ChapterId,
  type Highlight,
} from '../online-report.utils';
import { CategoryBars } from './category-bars';
import { CATEGORY_ICON, categoryClasses } from './category-style';

type SummaryChapterProps = {
  categories: Readonly<Record<CategoryKey, CategorySummary>>;
  onOpenChapter: (chapter: ChapterId) => void;
};

export function SummaryChapter({ categories, onOpenChapter }: SummaryChapterProps) {
  const { t } = useTranslation('onlineReports');
  const { best, worst } = bestAndWorst(categories);
  const { strengths, concerns } = reportHighlights(categories);
  const scoredCount = scoredCategories(categories).length;

  const title =
    best === undefined
      ? t('summary.titleEmpty')
      : worst === undefined
        ? t('summary.titleSingle', { best: t(`category.${best}`) })
        : t('summary.title', { best: t(`category.${best}`), worst: t(`category.${worst}`) });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <span className="text-eyebrow font-extrabold text-info-ink uppercase">
          {t('chapter.summary')}
        </span>
        <h2 className="text-h2 text-balance">{title}</h2>
        <p className="text-lead-sm text-muted-foreground">
          {t('summary.lead', { count: scoredCount })}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <HighlightList
          icon={ThumbsUpIcon}
          title={t('summary.strengths')}
          titleClassName="text-brand"
          items={strengths}
          emptyText={t('summary.noStrengths')}
          tone="above"
          onOpenChapter={onOpenChapter}
        />
        <HighlightList
          icon={TriangleAlertIcon}
          title={t('summary.concerns')}
          titleClassName="text-warning"
          items={concerns}
          emptyText={t('summary.noConcerns')}
          tone="below"
          onOpenChapter={onOpenChapter}
        />
      </div>
      <CategoryBars categories={categories} onOpenChapter={onOpenChapter} />
    </div>
  );
}

type HighlightListProps = {
  icon: LucideIcon;
  title: string;
  titleClassName: string;
  items: readonly Highlight[];
  emptyText: string;
  tone: 'above' | 'below';
  onOpenChapter: (chapter: ChapterId) => void;
};

function HighlightList({
  icon: Icon,
  title,
  titleClassName,
  items,
  emptyText,
  tone,
  onOpenChapter,
}: HighlightListProps) {
  const { t } = useTranslation('onlineReports');
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <h3
        id={titleId}
        className={cn('flex items-center gap-2 text-body-sm font-bold', titleClassName)}
      >
        <Icon aria-hidden className="size-4.5" />
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="border-t border-border-subtle pt-3 text-small text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {items.map((item) => {
            const ItemIcon = CATEGORY_ICON[item.key];
            const name = t(`category.${item.key}`);
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChapter(chapterOfCategory(item.key));
                  }}
                  className="flex w-full items-start gap-3 border-t border-border-subtle pt-3 text-left"
                >
                  <span
                    className={cn(
                      'grid size-8 flex-none place-items-center rounded-md',
                      categoryClasses(item.key).tile,
                    )}
                  >
                    <ItemIcon aria-hidden className="size-4" />
                  </span>
                  <span className="flex flex-1 flex-col gap-0.5">
                    <strong className="text-body-sm">
                      {t('summary.scoreOf', { name, score: item.score })}
                    </strong>
                    <span className="text-small text-muted-foreground">
                      {t(tone === 'above' ? 'summary.aboveAverage' : 'summary.belowAverage', {
                        average: item.cityAverage,
                        percent: formatPercent(item.percentile / 100),
                      })}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
