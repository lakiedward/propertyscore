import { ArrowRightIcon, ThumbsUpIcon, TriangleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { REPORT_HUES } from '@/components/report/report-hues';
import { ReportIconTile } from '@/components/report/report-icon-tile';
import { cn } from '@/lib/utils';
import { CATEGORY_META, type ReportTab } from '../../../report-chapter-meta';
import {
  cardTitleKind,
  highlights,
  standing,
  type ScoredCategory,
} from '../../../report-summary.utils';

type SummaryHighlightsProps = {
  scored: readonly ScoredCategory[];
  cityName: string;
  onOpenChapter: (tab: ReportTab) => void;
};

export function SummaryHighlights({ scored, cityName, onOpenChapter }: SummaryHighlightsProps) {
  const { t } = useTranslation('smartCheck');
  const { good, watch } = highlights(scored);

  const groups = [
    {
      key: 'good',
      label: t('report.chapters.summary.good'),
      icon: ThumbsUpIcon,
      tone: 'text-success',
      items: good,
    },
    {
      key: 'watch',
      label: t('report.chapters.summary.watch'),
      icon: TriangleAlertIcon,
      tone: 'text-warning',
      items: watch,
    },
  ] as const;

  return groups.map((group) =>
    group.items.length === 0 ? null : (
      <section key={group.key} aria-label={group.label} className="grid gap-4">
        <h3
          className={cn(
            'mt-1.5 -mb-1 flex items-center gap-2 text-body-sm font-extrabold',
            group.tone,
          )}
        >
          <group.icon aria-hidden className="size-4" />
          {group.label}
        </h3>
        <ul className="grid gap-3 w960:grid-cols-3">
          {group.items.map((item) => (
            <li key={item.key} className="flex min-w-0">
              <HighlightCard
                item={item}
                cityName={cityName}
                onOpen={() => {
                  onOpenChapter(CATEGORY_META[item.key].chapter);
                }}
              />
            </li>
          ))}
        </ul>
      </section>
    ),
  );
}

type HighlightCardProps = {
  item: ScoredCategory;
  cityName: string;
  onOpen: () => void;
};

function HighlightCard({ item, cityName, onOpen }: HighlightCardProps) {
  const { t } = useTranslation('smartCheck');
  const meta = CATEGORY_META[item.key];
  const place = standing(item);
  const standingText =
    place.kind === 'none'
      ? null
      : place.kind === 'better'
        ? t('report.chapters.summary.standing.better', { percent: place.percent, city: cityName })
        : t(`report.chapters.summary.standing.${place.kind}`);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-card p-5 text-left text-foreground shadow-report-card transition-[translate,box-shadow,border-color] duration-(--duration-fast) ease-standard hover:-translate-y-0.5 hover:border-border-strong hover:shadow-report-hover focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <span className="flex w-full items-center justify-between">
        <ReportIconTile icon={meta.icon} hue={meta.hue} size="lg" />
        <span
          className={cn(
            'text-[40px] leading-none font-extrabold tracking-[-0.04em] tabular-nums',
            REPORT_HUES[meta.hue].text,
          )}
        >
          {item.score}
          <small className="ml-0.5 text-small font-bold tracking-normal text-muted-foreground">
            {t('report.frame.outOf')}
          </small>
        </span>
      </span>
      <b className="text-[17px] leading-[1.3]">
        {t(`report.chapters.summary.cardTitle.${cardTitleKind(item)}`, {
          topic: t(`report.categories.${item.key}.topic`),
        })}
      </b>
      <span className="text-small leading-compact text-muted-foreground">
        {standingText} {t('report.chapters.summary.cardAverage', { average: item.average })}
      </span>
      <span className="mt-auto inline-flex items-center gap-1.5 text-[13.5px] font-extrabold text-brand">
        {t('report.chapters.summary.openChapter')}
        <ArrowRightIcon
          aria-hidden
          className="size-3.5 transition-transform duration-(--duration-fast) ease-standard group-hover:translate-x-0.75"
        />
      </span>
    </button>
  );
}
