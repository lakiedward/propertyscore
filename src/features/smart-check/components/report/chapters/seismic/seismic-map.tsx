import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { MapMarkerItem, MapOverlay } from '@/components/map/map-canvas';
import { AddressPin } from '@/components/report/address-pin';
import { ReportMap } from '@/components/report/report-map';
import { boundsAround, ringAround } from '@/components/report/report-map.utils';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/i18n/format';
import { addressLabel, reportCenter } from '../../../../report-map.utils';
import type { ReadyReport } from '../../../../report.types';
import {
  SEISMIC_COLOR,
  SEISMIC_COLOR_DARK,
  earthquakeMarkerSize,
  SEISMIC_MAP_RADIUS_M,
  SEISMIC_RING_KM,
  markerLabels,
  ringLabelPosition,
  strongestEarthquakes,
  type SeismicEarthquakes,
} from '../../../../seismic.utils';

type SeismicMapProps = {
  report: ReadyReport;
  earthquakes: SeismicEarthquakes;
};

function QuakeDot({
  size,
  isTop,
  label,
  description,
}: {
  size: number;
  isTop: boolean;
  label: string | null;
  description: string;
}) {
  return (
    <span
      role="img"
      aria-label={description}
      style={
        {
          width: size,
          height: size,
          '--seismic': SEISMIC_COLOR,
          '--seismic-dark': SEISMIC_COLOR_DARK,
        } as CSSProperties
      }
      className={cn(
        'pointer-events-none grid place-items-center rounded-full border',
        isTop
          ? 'border-[1.5px] border-(--seismic-dark) bg-(--seismic)/55'
          : 'border-(--seismic)/55 bg-[#C99A74]/32',
      )}
    >
      {label ? (
        <b className="text-[11px] leading-none font-extrabold whitespace-nowrap text-white">
          {label}
        </b>
      ) : null}
    </span>
  );
}

export function SeismicMap({ report, earthquakes }: SeismicMapProps) {
  const { t } = useTranslation('smartCheck');
  const center = reportCenter(report);
  const [longitude, latitude] = center;
  const top = strongestEarthquakes(earthquakes);
  const bounds = boundsAround([longitude, latitude], SEISMIC_MAP_RADIUS_M);
  const overlays: MapOverlay[] = SEISMIC_RING_KM.map((km) => ({
    id: `seismic-ring-${String(km)}`,
    kind: 'line' as const,
    colorToken: '--ps-amber-800',
    width: 1.2,
    dash: [4, 5],
    isVisible: true,
    data: ringAround([longitude, latitude], km * 1000),
  }));

  const labels = markerLabels(top);
  const ordered = [...earthquakes.events].sort(
    (left, right) =>
      left.magnitude - right.magnitude || Number(labels.has(left)) - Number(labels.has(right)),
  );
  const markers: MapMarkerItem[] = [
    ...ordered.map((event, index) => {
      const isTop = labels.has(event);
      const size = Math.max(earthquakeMarkerSize(event.magnitude), labels.get(event) ? 22 : 6);
      return {
        id: `quake-${String(index)}`,
        position: event.location,
        anchor: 'center' as const,
        isRaised: isTop,
        node: (
          <QuakeDot
            size={size}
            isTop={isTop}
            label={labels.get(event) ?? null}
            description={t('report.chapters.seismic.map.quakeLabel', {
              magnitude: formatNumber(event.magnitude, { minimumFractionDigits: 1 }),
            })}
          />
        ),
      };
    }),
    ...SEISMIC_RING_KM.map((km) => ({
      id: `seismic-ring-label-${String(km)}`,
      position: ringLabelPosition(center, km),
      anchor: 'left' as const,
      node: (
        <span className="pointer-events-none text-[11px] font-bold text-(--ps-amber-800)">
          {t('report.chapters.seismic.list.distance', { km })}
        </span>
      ),
    })),
    {
      id: 'address',
      position: center,
      anchor: 'bottom',
      isRaised: true,
      node: <AddressPin label={addressLabel(report.address_text)} />,
    },
  ];

  return (
    <ReportMap
      label={t('report.chapters.seismic.map.label', { since: earthquakes.since_year })}
      errorLabel={t('report.frame.hero.mapError')}
      center={center}
      zoom={9}
      bounds={bounds}
      boundsPadding={36}
      hasNavigationControl
      markers={markers}
      overlays={overlays}
    />
  );
}
