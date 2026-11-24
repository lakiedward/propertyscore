import { InfoIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate, formatNumber } from '@/i18n/format';
import type { ReadyReport } from '../../../../report.types';
import {
  earthquakeCatalogue,
  LISTED_EARTHQUAKES,
  SEISMIC_COLOR,
  strongestEarthquakes,
  type SeismicEarthquakes,
} from '../../../../seismic.utils';
import { SeismicConclusion } from './seismic-conclusion';
import { SeismicList } from './seismic-list';
import { SeismicMap } from './seismic-map';

const DATE_FORMAT = { day: 'numeric', month: 'long', year: 'numeric' } as const;

type Seismic = NonNullable<ReadyReport['result']['sections']['seismic']>;

type SeismicMapBlockProps = {
  report: ReadyReport;
  seismic: Seismic;
  earthquakes: SeismicEarthquakes;
};

export function SeismicMapBlock({ report, seismic, earthquakes }: SeismicMapBlockProps) {
  const { t } = useTranslation('smartCheck');
  const top = strongestEarthquakes(earthquakes, LISTED_EARTHQUAKES);

  return (
    <div className="min-w-0">
      <section
        aria-label={t('report.chapters.seismic.map.label', { since: earthquakes.since_year })}
        className="grid min-w-0 overflow-hidden rounded-icon border border-border bg-card w1059:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
      >
        <div className="min-w-0 bg-report-map-land">
          <div className="relative h-[360px] w560:h-[460px] w1059:h-[600px]">
            <SeismicMap report={report} earthquakes={earthquakes} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border-subtle bg-card px-3 py-2.5 text-[12px] font-semibold text-muted-foreground w560:px-4 w560:py-3 w560:text-[13px]">
            <span className="flex items-center gap-1.75">
              <i
                aria-hidden="true"
                className="block size-3.5 rounded-full border-[1.5px] border-(--ps-amber-800)/70 bg-(--ps-amber-200)/50"
              />
              {t('report.chapters.seismic.map.keyQuake')}
            </span>
            <span className="flex items-center gap-1.75">
              <i
                aria-hidden="true"
                style={{ background: SEISMIC_COLOR }}
                className="block size-3.5 rounded-full"
              />
              {t('report.chapters.seismic.map.keyTop', { count: top.length })}
            </span>
          </div>
        </div>
        <aside className="min-w-0 px-3.5 py-4.5 w560:p-6">
          <SeismicList
            events={top}
            since={earthquakes.since_year}
            radiusKm={earthquakes.radius_km}
          />
          <SeismicConclusion report={report} seismic={seismic} earthquakes={earthquakes} />
        </aside>
      </section>
      <p className="mt-2.5 flex gap-2 text-[12.5px] leading-[1.45] text-muted-foreground">
        <InfoIcon aria-hidden className="mt-0.5 size-3.75 flex-none" />
        <span>
          {t('report.chapters.seismic.source', {
            catalogue: t(`report.chapters.seismic.catalogue.${earthquakeCatalogue(earthquakes)}`),
            since: earthquakes.since_year,
            min: formatNumber(earthquakes.min_magnitude, { minimumFractionDigits: 1 }),
            retrieved: earthquakes.retrieved_on
              ? t('report.chapters.seismic.retrieved', {
                  date: formatDate(earthquakes.retrieved_on, DATE_FORMAT),
                })
              : '',
          })}
        </span>
      </p>
    </div>
  );
}
