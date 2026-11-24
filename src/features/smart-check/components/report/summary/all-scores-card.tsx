import { useTranslation } from 'react-i18next';
import { REPORT_HUES } from '@/components/report/report-hues';
import { ReportIconTile } from '@/components/report/report-icon-tile';
import { cn } from '@/lib/utils';
import { CATEGORY_META, type ReportTab } from '../../../report-chapter-meta';
import {
  CATEGORY_GROUPS,
  cityDifference,
  type ScoredCategory,
} from '../../../report-summary.utils';

const AXIS = [0, 25, 50, 75, 100] as const;

const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-2 w760:grid-cols-[170px_minmax(0,1fr)_120px] w760:gap-4 w1059:grid-cols-[220px_minmax(0,1fr)_150px]';

type AllScoresCardProps = {
  scored: readonly ScoredCategory[];
  zoneScore: number | null;
  onOpenChapter: (tab: ReportTab) => void;
};

export function AllScoresCard({ scored, zoneScore, onOpenChapter }: AllScoresCardProps) {
  const { t } = useTranslation('smartCheck');
  const byKey = new Map(scored.map((item) => [item.key, item]));

  return (
    <section
      aria-labelledby="summary-all-scores"
      className="rounded-icon border border-border bg-card px-3.5 py-4.5 shadow-report-panel w760:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-meta font-extrabold tracking-label text-report-hero uppercase">
            {t('report.chapters.summary.scores.eyebrow')}
          </p>
          <h3
            id="summary-all-scores"
            className="mt-1.5 text-[clamp(20px,2vw,26px)] leading-[1.2] font-extrabold tracking-[-0.02em]"
          >
            {t('report.chapters.summary.scores.title')}
          </h3>
        </div>
        <span className="flex items-center gap-3.5 text-meta text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <i aria-hidden="true" className="h-1.5 w-4.5 rounded-[3px] bg-primary" />
            {t('report.chapters.summary.scores.legendAddress')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i aria-hidden="true" className="h-3 w-0.5 bg-foreground" />
            {t('report.chapters.summary.scores.legendAverage')}
          </span>
        </span>
      </div>
      <p className="mt-0.5 text-caption text-muted-foreground">
        {t('report.chapters.summary.scores.hint')}
      </p>
      <div aria-hidden="true" className={cn(ROW_GRID, 'mt-3.5 h-5.5 px-4.25 w760:px-0')}>
        <span className="hidden w760:block" />
        <span className="relative col-span-full h-full w760:col-span-1">
          {AXIS.map((value) => (
            <i
              key={value}
              style={{ left: `${value}%` }}
              className="absolute top-0 -translate-x-1/2 text-[11.5px] font-bold text-muted-foreground not-italic"
            >
              {value}
            </i>
          ))}
        </span>
        <span className="hidden w760:block" />
      </div>
      {CATEGORY_GROUPS.map((group) => {
        const rows = group.categories.flatMap((key) => byKey.get(key) ?? []);
        if (rows.length === 0) return null;
        return (
          <div key={group.key} className="mt-3.5">
            <h4 className="border-b border-border-subtle pb-2 text-meta font-extrabold tracking-[0.07em] text-muted-foreground uppercase">
              {t(`report.chapters.summary.scores.groups.${group.key}`)}
            </h4>
            <ul>
              {rows.map((item) => (
                <li key={item.key}>
                  <ScoreRow
                    item={item}
                    onOpen={() => {
                      onOpenChapter(CATEGORY_META[item.key].chapter);
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {zoneScore === null ? null : (
        <p className="mt-4 text-caption text-muted-foreground">
          {t('report.chapters.summary.scores.note', { score: zoneScore, count: scored.length })}
        </p>
      )}
    </section>
  );
}

type ScoreRowProps = {
  item: ScoredCategory;
  onOpen: () => void;
};

function ScoreRow({ item, onOpen }: ScoreRowProps) {
  const { t } = useTranslation('smartCheck');
  const meta = CATEGORY_META[item.key];
  const hue = REPORT_HUES[meta.hue];
  const name = t(`report.categories.${item.key}.name`);
  const difference = cityDifference(item);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t('report.chapters.summary.scores.rowLabel', {
        name,
        score: item.score,
        average: item.average,
      })}
      className={cn(
        ROW_GRID,
        'w-full items-center rounded-md border-b border-border-subtle px-1 py-3 text-left text-foreground transition-colors duration-(--duration-fast) hover:bg-surface-highlight focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none w760:px-1.5 w760:py-2.5',
      )}
    >
      <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-2.5 w760:col-start-auto w760:row-start-auto">
        <ReportIconTile icon={meta.icon} hue={meta.hue} size="sm" />
        <span className="min-w-0">
          <b className="text-body-sm">{name}</b>
          <small className="ml-1.5 text-meta font-bold text-muted-foreground">
            {t('report.chapters.summary.scores.weight', { weight: Math.round(item.weight) })}
          </small>
        </span>
      </span>
      <span className="relative col-span-full row-start-2 mx-4.25 h-7.5 bg-[linear-gradient(90deg,transparent_calc(25%-.5px),var(--color-border-subtle)_calc(25%-.5px),var(--color-border-subtle)_calc(25%+.5px),transparent_calc(25%+.5px),transparent_calc(50%-.5px),var(--color-border-subtle)_calc(50%-.5px),var(--color-border-subtle)_calc(50%+.5px),transparent_calc(50%+.5px),transparent_calc(75%-.5px),var(--color-border-subtle)_calc(75%-.5px),var(--color-border-subtle)_calc(75%+.5px),transparent_calc(75%+.5px))] w760:col-span-1 w760:row-start-auto w760:mx-0">
        <span
          style={{ width: `${item.score}%` }}
          className={cn('absolute top-2.25 left-0 h-3 rounded-full', hue.surface)}
        />
        {difference.kind === 'flat' ? null : (
          <span
            style={{ left: `${item.average}%` }}
            className="absolute inset-y-1 -ml-px w-0.5 rounded-[2px] bg-foreground opacity-70"
          />
        )}
        <span
          style={{ left: `${item.score}%` }}
          className={cn(
            'absolute top-1/2 -mt-3.25 -ml-4.25 grid h-6.5 w-8.5 place-items-center rounded-full shadow-report-dot',
            hue.fill,
          )}
        >
          <b className="text-caption font-extrabold text-on-inverse tabular-nums">{item.score}</b>
        </span>
      </span>
      <span
        className={cn(
          'col-start-2 row-start-1 text-right text-[12.5px] font-bold w760:col-start-auto w760:row-start-auto',
          difference.kind === 'up' && 'text-success',
          difference.kind === 'down' && 'text-warning',
          (difference.kind === 'flat' || difference.kind === 'atAverage') &&
            'text-muted-foreground',
        )}
      >
        {difference.kind === 'up' || difference.kind === 'down'
          ? t(`report.chapters.summary.scores.difference.${difference.kind}`, {
              points: difference.points,
            })
          : t(`report.chapters.summary.scores.difference.${difference.kind}`)}
      </span>
    </button>
  );
}
