import { useTranslation } from 'react-i18next';
import { formatDate, formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { extremeMonths, monthDate } from '../air-section.utils';
import type { ScoredAirSection } from '../online-report.types';
import { categoryClasses } from './category-style';
import { ChapterFacts } from './chapter-facts';
import { ChapterLimits } from './chapter-limits';
import { ChapterPanel } from './chapter-panel';
import { NoSectionData } from './no-section-data';

type AirChapterProps = {
  section: ScoredAirSection | undefined;
};

export function AirChapter({ section }: AirChapterProps) {
  const { t } = useTranslation('onlineReports');
  const limits = [t('air.limits.indoor'), t('air.limits.notMeasured')];

  if (section?.status !== 'scored' || section.pm25_annual === null) {
    return (
      <div className="flex flex-col gap-5">
        <NoSectionData text={t('air.noData')} />
        <ChapterLimits items={limits} />
      </div>
    );
  }

  const hue = categoryClasses('air');
  const micrograms = (value: number) =>
    t('air.micrograms', { value: formatNumber(value, { maximumFractionDigits: 1 }) });
  const monthName = (month: string) => formatDate(monthDate(month), { month: 'long' });
  const shortMonth = (month: string) =>
    formatDate(monthDate(month), { month: 'short', year: 'numeric' });
  const firstMonth = section.months[0];
  const lastMonth = section.months.at(-1);
  const { highest, lowest } = extremeMonths(section.months, section.pm25_monthly);
  const chartMax = Math.max(
    section.limits.pm25 * 1.5,
    ...section.pm25_monthly.map((value) => value ?? 0),
  );
  const overLimit = section.months_over_limit.pm25 ?? 0;

  const facts = [
    { key: 'annual', value: micrograms(section.pm25_annual), label: t('air.facts.annual') },
    {
      key: 'highest',
      value: highest ? micrograms(highest.value) : '–',
      label: highest
        ? t('air.facts.highest', { month: monthName(highest.month) })
        : t('air.facts.highestNone'),
    },
    {
      key: 'lowest',
      value: lowest ? micrograms(lowest.value) : '–',
      label: lowest
        ? t('air.facts.lowest', { month: monthName(lowest.month) })
        : t('air.facts.lowestNone'),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <ChapterFacts toneClassName={hue.tile} facts={facts} />
      <ChapterPanel
        id="air-months-title"
        title={
          section.verdict_code ? t(`air.verdict.${section.verdict_code}`) : t('air.months.title')
        }
        lead={t('air.months.lead', { count: overLimit, limit: micrograms(section.limits.pm25) })}
      >
        <figure className="flex flex-col gap-2">
          <ol
            aria-label={t('air.months.chartLabel')}
            className="relative grid h-40 grid-flow-col items-end gap-1.5"
          >
            <span
              aria-hidden
              style={{ bottom: `${String((section.limits.pm25 / chartMax) * 100)}%` }}
              className="absolute inset-x-0 border-t-2 border-dashed border-category-safety"
            />
            {section.months.map((month, index) => {
              const value = section.pm25_monthly[index] ?? null;
              const isOver = value !== null && value > section.limits.pm25;
              return (
                <li key={month} className="flex h-full flex-col justify-end">
                  <span
                    aria-label={t('air.months.bar', {
                      month: monthName(month),
                      value: value === null ? t('air.months.noValue') : micrograms(value),
                    })}
                    style={{ height: `${String(((value ?? 0) / chartMax) * 100)}%` }}
                    className={cn(
                      'block min-h-0.5 rounded-t-sm',
                      value === null ? 'bg-border' : isOver ? 'bg-category-safety' : hue.fill,
                    )}
                  />
                </li>
              );
            })}
          </ol>
          <figcaption className="flex justify-between text-meta text-muted-foreground">
            <span>{firstMonth ? shortMonth(firstMonth) : ''}</span>
            <span>{t('air.months.limitLegend', { limit: micrograms(section.limits.pm25) })}</span>
            <span>{lastMonth ? shortMonth(lastMonth) : ''}</span>
          </figcaption>
        </figure>
      </ChapterPanel>
      <ChapterPanel id="air-compare-title" title={t('air.compare.title')}>
        <dl className="grid gap-2 text-small sm:grid-cols-2">
          <div className="flex justify-between gap-3 rounded-lg bg-surface-sunken p-3.5">
            <dt>{t('air.compare.address')}</dt>
            <dd className="font-bold tabular-nums">{micrograms(section.pm25_annual)}</dd>
          </div>
          <div className="flex justify-between gap-3 rounded-lg bg-surface-sunken p-3.5">
            <dt>{t('air.compare.city')}</dt>
            <dd className="font-bold tabular-nums">
              {section.city_avg.pm25 === null ? '–' : micrograms(section.city_avg.pm25)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 rounded-lg bg-surface-sunken p-3.5">
            <dt>{t('air.compare.no2')}</dt>
            <dd className="font-bold tabular-nums">
              {section.no2_annual === null
                ? t('air.compare.noNo2')
                : micrograms(section.no2_annual)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 rounded-lg bg-surface-sunken p-3.5">
            <dt>{t('air.compare.precision')}</dt>
            <dd className="font-bold">{t(`air.precision.${section.spatial_method}`)}</dd>
          </div>
        </dl>
      </ChapterPanel>
      <ChapterLimits
        items={[...limits, ...(section.calibrated.pm25 ? [] : [t('air.limits.uncalibrated')])]}
      />
    </div>
  );
}
