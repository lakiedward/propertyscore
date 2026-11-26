import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate, formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import {
  GREEN_AMENITIES,
  isParkWalkEstimated,
  parkWalkMinutes,
  type GreenPark,
} from '../../../../green.utils';
import type { ReadyReport } from '../../../../report.types';
import { GreenMap } from './green-map';

const DATE_FORMAT = { day: 'numeric', month: 'short', year: 'numeric' } as const;

type GreenParksBlockProps = {
  report: ReadyReport;
  parks: readonly GreenPark[];
};

export function GreenParksBlock({ report, parks }: GreenParksBlockProps) {
  const { t } = useTranslation('smartCheck');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const osmDate = report.result.snapshot.source_dates.osm;
  const green = report.result.sections.green;

  return (
    <section aria-label={t('report.chapters.green.parks.label')} className="min-w-0">
      <div className="grid min-w-0 overflow-hidden rounded-icon border border-border bg-card shadow-report-card w960:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="relative aspect-[3000/2300] min-w-0 bg-report-map-land w960:aspect-auto w960:min-h-130">
          <div className="absolute inset-0">
            <GreenMap report={report} parks={parks} selectedId={selectedId} />
          </div>
        </div>
        <div
          role="group"
          aria-label={t('report.chapters.green.parks.list')}
          className="grid content-start gap-2 p-2.5 w760:grid-cols-2 w760:p-3.5 w960:max-h-160 w960:grid-cols-1 w960:overflow-auto"
        >
          {parks.map((park, index) => {
            const isOn = selectedId === park.id;
            const amenities = GREEN_AMENITIES.filter((amenity) => park.amenities.includes(amenity));
            return (
              <button
                key={park.id}
                type="button"
                aria-pressed={isOn}
                onClick={() => {
                  setSelectedId((current) => (current === park.id ? null : park.id));
                }}
                className={cn(
                  'flex w-full flex-col gap-1.5 rounded-xl border bg-card px-3.5 py-3 text-left transition-colors duration-(--duration-fast) hover:bg-report-green-soft focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none',
                  isOn ? 'border-report-green bg-report-green-surface' : 'border-border',
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-report-green text-[13px] font-extrabold text-card"
                  >
                    {index + 1}
                  </span>
                  <b className="text-[15.5px] font-extrabold">
                    {park.name ?? t('report.chapters.green.parks.unnamed')}
                  </b>
                </span>
                <span className="flex items-baseline gap-1.5 pl-9.5 text-[13px] text-muted-foreground">
                  <b className="text-[18px] font-extrabold text-foreground tabular-nums">
                    {formatNumber(park.area_ha, { maximumFractionDigits: 1 })}
                  </b>
                  {t('report.chapters.green.parks.hectares')}
                  <span aria-hidden="true">·</span>
                  {t(
                    isParkWalkEstimated(park, green)
                      ? 'report.chapters.green.parks.walkApprox'
                      : 'report.chapters.green.parks.walk',
                    { minutes: parkWalkMinutes(park) },
                  )}
                </span>
                {amenities.length > 0 ? (
                  <span className="flex flex-wrap gap-1.25 pl-9.5">
                    {amenities.map((amenity) => (
                      <i
                        key={amenity}
                        className="rounded-full bg-report-green-surface px-2.25 py-0.75 text-[12px] font-bold text-(--ps-leaf-800) not-italic"
                      >
                        {t(`report.chapters.green.amenities.${amenity}`)}
                      </i>
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-2.5 flex gap-2 px-1 text-[12.5px] leading-[1.45] text-muted-foreground">
        {osmDate
          ? t('report.chapters.green.parks.source', { date: formatDate(osmDate, DATE_FORMAT) })
          : t('report.chapters.green.parks.sourceNoDate')}
      </p>
    </section>
  );
}
