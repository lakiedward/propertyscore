import { Trans, useTranslation } from 'react-i18next';
import { ChapterScoreCard } from '@/components/report/chapter-score-card';
import { ChapterSources } from '@/components/report/chapter-sources';
import type { ReportHue } from '@/components/report/report-hues';
import { scoreBand } from '@/components/report/score-bands';
import { formatDate, formatList, formatNumber } from '@/i18n/format';
import { scoredCategories, standing } from '../../../../report-summary.utils';
import type { ReadyReport } from '../../../../report.types';

const DATE_FORMAT = { day: 'numeric', month: 'short', year: 'numeric' } as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type ChapterScoreBlockProps = {
  report: ReadyReport;
  chapter: 'green' | 'noise';
  hue: ReportHue;
  sourceLabels: Readonly<Record<string, string>>;
};

export function ChapterScoreBlock({ report, chapter, hue, sourceLabels }: ChapterScoreBlockProps) {
  const { t } = useTranslation('smartCheck');
  const { result } = report;
  const summary = result.categories[chapter];
  const scored = scoredCategories(result);
  const item = scored.find((entry) => entry.key === chapter);
  const base = `report.chapters.${chapter}` as const;
  const cityName = result.city.name;
  const band = item ? scoreBand(item.score) : null;
  const range =
    summary?.city_min != null && summary.city_max != null
      ? { min: summary.city_min, max: summary.city_max }
      : null;

  const headline = () => {
    if (!item || !summary) return null;
    const position = standing(item);
    if (position.kind === 'flat') {
      return t(`${base}.score.flat`, {
        city: cityName,
        min: Math.round(range?.min ?? item.score),
        max: Math.round(range?.max ?? item.score),
      });
    }
    if (position.kind === 'best' || position.kind === 'worst') {
      return t(`${base}.score.${position.kind}`, { city: cityName });
    }
    if (position.kind === 'none') return t(`${base}.score.none`);
    return (
      <Trans
        t={t}
        i18nKey={`${base}.score.better`}
        values={{ percent: position.percent, city: cityName }}
        components={{
          strong: (
            <b
              className={
                chapter === 'green'
                  ? 'font-extrabold text-report-green'
                  : 'font-extrabold text-report-noise'
              }
            />
          ),
        }}
      />
    );
  };

  const weightTotal = scored.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  const weight = item ? (item.weight / weightTotal) * 100 : null;
  const sources = Object.entries(sourceLabels).flatMap(([key, label]) => {
    const date = result.snapshot.source_dates[key];
    return date ? [`${label} · ${ISO_DATE.test(date) ? formatDate(date, DATE_FORMAT) : date}`] : [];
  });

  return (
    <>
      {item && band !== null ? (
        <ChapterScoreCard
          hue={hue}
          score={item.score}
          average={item.average}
          range={range}
          headline={headline()}
          bandLabel={t(`report.bands.${band}`)}
          youLabel={t(`${base}.score.you`, { score: item.score })}
          averageLabel={t(`${base}.score.average`, { average: item.average })}
          rangeLabel={
            range && !item.isFlat
              ? t(`${base}.score.range`, { min: Math.round(range.min), max: Math.round(range.max) })
              : null
          }
          measures={{
            included: (
              <Trans t={t} i18nKey={`${base}.score.included`} components={{ strong: <b /> }} />
            ),
            excluded: (
              <Trans t={t} i18nKey={`${base}.score.excluded`} components={{ strong: <b /> }} />
            ),
          }}
        />
      ) : null}
      <ChapterSources title={t(`${base}.sources.title`)}>
        {sources.length > 0 ? (
          <p>
            <Trans
              t={t}
              i18nKey={`${base}.sources.list`}
              values={{ sources: formatList(sources) }}
              components={{ strong: <b /> }}
            />
          </p>
        ) : null}
        {weight !== null && item ? (
          <p>
            <Trans
              t={t}
              i18nKey={`${base}.sources.weight`}
              values={{
                weight: formatNumber(weight, { maximumFractionDigits: 0 }),
                points: formatNumber((item.score * weight) / 100, { maximumFractionDigits: 1 }),
              }}
              components={{ strong: <b /> }}
            />
          </p>
        ) : null}
        <p>{t(`${base}.sources.same`)}</p>
      </ChapterSources>
    </>
  );
}
