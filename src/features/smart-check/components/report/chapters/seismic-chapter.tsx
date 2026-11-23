import { Trans, useTranslation } from 'react-i18next';
import { ChapterSources } from '@/components/report/chapter-sources';
import { ReportChapterHead } from '@/components/report/report-chapter-head';
import { formatNumber } from '@/i18n/format';
import { strongestEarthquakes, type SeismicEarthquakes } from '../../../seismic.utils';
import type { ReportChapterProps } from '../report-chapter-props';
import { SeismicConclusion } from './seismic/seismic-conclusion';
import { SeismicMapBlock } from './seismic/seismic-map-block';
import { SeismicScaleCard } from './seismic/seismic-scale-card';

const SEISMIC_TITLE_ID = 'report-chapter-seismic';

function catalogueSources(earthquakes: SeismicEarthquakes | null): string {
  if (!earthquakes) return '';
  const names =
    earthquakes.sources.length > 0
      ? earthquakes.sources.map((source) => `${source.name}, ${source.license}`)
      : [earthquakes.catalogue];
  return ` · ${names.join(' · ')}`;
}

export function SeismicChapter({ report }: ReportChapterProps) {
  const { t } = useTranslation('smartCheck');
  const seismic = report.result.sections.seismic;
  const cityName = report.result.city.name;
  const eyebrow = t('report.chapters.seismic.eyebrow');

  if (!seismic) {
    return (
      <section aria-labelledby={SEISMIC_TITLE_ID} className="grid max-w-default min-w-0 gap-4">
        <ReportChapterHead
          hue="context"
          titleId={SEISMIC_TITLE_ID}
          eyebrow={eyebrow}
          title={t('report.chapters.seismic.title')}
        />
        <p className="rounded-icon border border-border bg-card p-5 text-muted-foreground">
          {t('report.chapters.seismic.noData')}
        </p>
      </section>
    );
  }

  const earthquakes =
    seismic.earthquakes && seismic.earthquakes.events.length > 0 ? seismic.earthquakes : null;
  const biggest = earthquakes ? strongestEarthquakes(earthquakes, 1)[0] : undefined;
  const levelLabel = seismic.level
    ? t(`report.chapters.seismic.levels.${seismic.level}`, { defaultValue: seismic.level })
    : null;

  const title =
    earthquakes && biggest
      ? t('report.chapters.seismic.headline.withQuakes', {
          magnitude: formatNumber(biggest.magnitude, { minimumFractionDigits: 1 }),
          year: biggest.date.slice(0, 4),
        })
      : t('report.chapters.seismic.headline.withoutQuakes', {
          value: formatNumber(seismic.ag_g, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          level: levelLabel?.toLocaleLowerCase() ?? '',
        });
  const lead =
    earthquakes && biggest
      ? t('report.chapters.seismic.lead.withQuakes', {
          count: earthquakes.events.length,
          since: earthquakes.since_year,
          min: formatNumber(earthquakes.min_magnitude, { minimumFractionDigits: 1 }),
          radius: formatNumber(earthquakes.radius_km),
          city: cityName,
        })
      : t('report.chapters.seismic.lead.withoutQuakes', { code: seismic.code, city: cityName });

  return (
    <section aria-labelledby={SEISMIC_TITLE_ID} className="grid max-w-default min-w-0 gap-4">
      <ReportChapterHead
        hue="context"
        titleId={SEISMIC_TITLE_ID}
        eyebrow={eyebrow}
        badge={t(`report.chapters.seismic.precision.${seismic.precision}`)}
        title={title}
        lead={lead}
      />
      {earthquakes ? (
        <SeismicMapBlock report={report} seismic={seismic} earthquakes={earthquakes} />
      ) : (
        <SeismicConclusion seismic={seismic} />
      )}
      <SeismicScaleCard seismic={seismic} citySlug={report.result.city.slug} cityName={cityName} />
      <ChapterSources title={t('report.chapters.seismic.sources.title')}>
        <p>
          <Trans
            t={t}
            i18nKey="report.chapters.seismic.sources.list"
            values={{ code: seismic.code, catalogue: catalogueSources(earthquakes) }}
            components={{ strong: <b /> }}
          />
        </p>
        <p>
          <Trans
            t={t}
            i18nKey="report.chapters.seismic.sources.weight"
            components={{ strong: <b /> }}
          />
        </p>
      </ChapterSources>
    </section>
  );
}
