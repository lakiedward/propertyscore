import { InfoIcon } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { ChapterSources } from '@/components/report/chapter-sources';
import { REPORT_HUES } from '@/components/report/report-hues';
import { ReportChapterHead } from '@/components/report/report-chapter-head';
import { formatDate, formatList, formatNumber } from '@/i18n/format';
import { airVerdict, hasWinterPeak, splitPeriod } from '../../../air-industry.utils';
import { scoredCategories } from '../../../report-summary.utils';
import { formatDistanceM } from '../../../safety.utils';
import { AirIndustryScoreCard } from '../air-industry/air-industry-score-card';
import { AirMonthsCard } from '../air-industry/air-months-card';
import { IndustrySitesCard } from '../air-industry/industry-sites-card';
import type { ReportChapterProps } from '../report-chapter-props';

const TITLE_ID = 'report-chapter-air-industry';
const PERIOD_FORMAT = { month: 'short', year: 'numeric', timeZone: 'UTC' } as const;
const WEIGHTED = ['air', 'industry'] as const;

function formatPeriod(value: string | undefined): string | null {
  const period = splitPeriod(value);
  if (!period) return null;
  const [from, to] = period;
  return `${formatDate(`${from}-01`, PERIOD_FORMAT)} – ${formatDate(`${to}-01`, PERIOD_FORMAT)}`;
}

export function AirIndustryChapter({ report }: ReportChapterProps) {
  const { t } = useTranslation('smartCheck');
  const { result } = report;
  const { air, industry } = result.sections;
  const dates = result.snapshot.source_dates;
  if (!air && !industry) return null;

  const nearest = industry?.nearest_m ?? null;
  const distance = nearest === null ? null : formatDistanceM(nearest);
  const airTitle = air
    ? t(`report.chapters.airIndustry.verdict.${airVerdict(air.verdict_code)}`)
    : null;
  const title = (() => {
    if (airTitle === null) {
      return distance === null
        ? t('report.chapters.airIndustry.headline.industryNone')
        : t('report.chapters.airIndustry.headline.industryNearest', { distance });
    }
    if (!industry) return t('report.chapters.airIndustry.headline.airOnly', { air: airTitle });
    return distance === null
      ? t('report.chapters.airIndustry.headline.noSites', { air: airTitle })
      : t('report.chapters.airIndustry.headline.withNearest', { air: airTitle, distance });
  })();
  const lead = [
    air && hasWinterPeak(air)
      ? t('report.chapters.airIndustry.lead.winter', { city: result.city.name })
      : null,
    distance === null ? null : t('report.chapters.airIndustry.lead.nearest', { distance }),
  ]
    .filter(Boolean)
    .join(' ');

  const eyebrowPart = (category: 'air' | 'industry') => {
    const score = result.categories[category]?.score;
    const name = t(`report.categories.${category}.name`);
    return (
      <span key={category} className={REPORT_HUES[category].text}>
        {score == null
          ? t('report.chapters.airIndustry.eyebrowPartNoScore', { name })
          : t('report.chapters.airIndustry.eyebrowPart', { name, score: Math.round(score) })}
      </span>
    );
  };

  const period = formatPeriod(dates.cams);
  const year = industry?.source.reporting_year;
  const note = [
    air
      ? period
        ? t('report.chapters.airIndustry.note.air', { period })
        : t('report.chapters.airIndustry.note.airNoPeriod')
      : null,
    year ? t('report.chapters.airIndustry.note.industry', { year }) : null,
  ]
    .filter(Boolean)
    .join(' ');

  const sourceLabels = (
    [
      ['cams', period ?? dates.cams],
      ['eea_stations', formatPeriod(dates.eea_stations) ?? dates.eea_stations],
      [
        'eea_industrial',
        [dates.eea_industrial_year, dates.eea_industrial && `(${dates.eea_industrial})`]
          .filter(Boolean)
          .join(' '),
      ],
    ] as const
  ).flatMap(([key, detail]) =>
    detail ? [`${t(`report.chapters.airIndustry.sources.${key}`)} · ${detail}`] : [],
  );

  const scored = scoredCategories(result);
  const weightTotal = scored.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  const weights = WEIGHTED.flatMap((key) => {
    const item = scored.find((entry) => entry.key === key);
    if (!item) return [];
    const weight = (item.weight / weightTotal) * 100;
    return [
      {
        key,
        name: t(`report.categories.${key}.name`),
        weight: formatNumber(weight, { maximumFractionDigits: 0 }),
        points: formatNumber((item.score * weight) / 100, { maximumFractionDigits: 1 }),
      },
    ];
  });

  return (
    <section aria-labelledby={TITLE_ID} className="grid max-w-default min-w-0 gap-4">
      <ReportChapterHead
        hue="air"
        titleId={TITLE_ID}
        eyebrow={
          <span className="flex flex-wrap gap-x-3.5">
            {eyebrowPart('air')}
            {eyebrowPart('industry')}
          </span>
        }
        badge={t('report.chapters.airIndustry.badge')}
        title={title}
        lead={lead || undefined}
      />
      {air || industry ? (
        <div className="grid min-w-0 gap-4 w960:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {air ? <AirMonthsCard air={air} /> : null}
          {industry ? <IndustrySitesCard industry={industry} /> : null}
        </div>
      ) : null}
      {note ? (
        <p className="flex gap-2 text-[12.5px] leading-[1.45] text-muted-foreground">
          <InfoIcon aria-hidden="true" className="mt-0.5 size-3.75 shrink-0" />
          <span>{note}</span>
        </p>
      ) : null}
      <AirIndustryScoreCard report={report} category="air" />
      <AirIndustryScoreCard report={report} category="industry" />
      <ChapterSources title={t('report.chapters.airIndustry.sources.title')}>
        {sourceLabels.length > 0 ? (
          <p>
            <Trans
              t={t}
              i18nKey="report.chapters.airIndustry.sources.list"
              values={{ sources: formatList(sourceLabels) }}
              components={{ strong: <b /> }}
            />
          </p>
        ) : null}
        {weights.map((entry) => (
          <p key={entry.key}>
            <Trans
              t={t}
              i18nKey="report.chapters.airIndustry.sources.weight"
              values={entry}
              components={{ strong: <b /> }}
            />
          </p>
        ))}
        <p>{t('report.chapters.airIndustry.sources.same')}</p>
      </ChapterSources>
    </section>
  );
}
