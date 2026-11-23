import { Trans, useTranslation } from 'react-i18next';
import { formatDate, formatNumber } from '@/i18n/format';
import {
  SEISMIC_COLOR,
  listedMagnitudeSize,
  type SeismicEarthquake,
} from '../../../../seismic.utils';

const DATE_FORMAT = { day: 'numeric', month: 'long', year: 'numeric' } as const;

type SeismicListProps = {
  events: readonly SeismicEarthquake[];
  since: number;
  radiusKm: number;
};

export function SeismicList({ events, since, radiusKm }: SeismicListProps) {
  const { t } = useTranslation('smartCheck');
  return (
    <>
      <p
        className="text-[12px] font-extrabold tracking-label uppercase"
        style={{ color: SEISMIC_COLOR }}
      >
        {t('report.chapters.seismic.list.eyebrow', { since })}
      </p>
      <h3 className="mt-1 text-[21px] leading-tight font-extrabold tracking-[-0.02em]">
        {t('report.chapters.seismic.list.title', { radius: formatNumber(radiusKm) })}
      </h3>
      <ol aria-label={t('report.chapters.seismic.list.label')} className="mt-3 grid list-none p-0">
        {events.map((event, index) => {
          const size = listedMagnitudeSize(event.magnitude);
          return (
            <li
              key={`${event.date}-${String(index)}`}
              className="flex items-center gap-3 border-t border-border-subtle py-2.25"
            >
              <span
                aria-hidden="true"
                style={{ width: size, height: size, minWidth: 26, background: SEISMIC_COLOR }}
                className="grid flex-none place-items-center rounded-full text-[12.5px] font-extrabold text-white"
              >
                {formatNumber(event.magnitude, { minimumFractionDigits: 1 })}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <b className="text-[14.5px] font-bold">
                  <span className="sr-only">
                    {t('report.chapters.seismic.map.quakeLabel', {
                      magnitude: formatNumber(event.magnitude, { minimumFractionDigits: 1 }),
                    })}
                    {', '}
                  </span>
                  {formatDate(event.date, DATE_FORMAT)}
                </b>
                {event.place ? (
                  <small className="text-[12.5px] text-muted-foreground">
                    {t('report.chapters.seismic.list.near', { place: event.place })}
                  </small>
                ) : null}
              </span>
              <span className="text-[18px] font-extrabold whitespace-nowrap tabular-nums">
                <Trans
                  t={t}
                  i18nKey="report.chapters.seismic.list.distance"
                  values={{ km: formatNumber(event.distance_km) }}
                  components={{
                    unit: <small className="text-[12px] font-bold text-muted-foreground" />,
                  }}
                />
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}
