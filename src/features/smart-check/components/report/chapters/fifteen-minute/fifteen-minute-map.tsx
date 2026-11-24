import { useTranslation } from 'react-i18next';
import type { MapMarkerItem, MapOverlay } from '@/components/map/map-canvas';
import { AddressPin } from '@/components/report/address-pin';
import { ReportMap } from '@/components/report/report-map';
import { decodePolyline6, lineCollection } from '@/components/report/report-map.utils';
import { cn } from '@/lib/utils';
import {
  FAMILY_STYLES,
  categoryFamily,
  nearestPlace,
  placeBounds,
  smoothAreas,
  widestIsochrone,
  type Family,
  type FifteenMinuteSection,
} from '../../../../fifteen-minute.utils';
import { addressLabel, areaCollection, reportCenter } from '../../../../report-map.utils';
import type { ReadyReport } from '../../../../report.types';

const ZONE_OPACITY = 0.14;

type FifteenMinuteMapProps = {
  report: ReadyReport;
  section: FifteenMinuteSection;
  selectedKey: string | null;
};

function PlaceDot({
  family,
  state,
  label,
}: {
  family: Family;
  state: 'normal' | 'dim' | 'selected';
  label?: string;
}) {
  const background = `var(${FAMILY_STYLES[family].color})`;
  return (
    <span aria-hidden="true" className="pointer-events-none flex items-center gap-1.5">
      <span
        style={{ background }}
        className={cn(
          'block rounded-full border-2 border-card shadow-report-label transition-opacity duration-(--duration-fast)',
          state === 'selected' ? 'size-4.5' : 'size-2.5',
          state === 'dim' && 'opacity-35',
        )}
      />
      {label ? (
        <span
          style={{ background }}
          className="rounded-full border-2 border-card px-2 py-0.5 text-meta font-extrabold whitespace-nowrap text-primary-foreground shadow-report-label"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}

function uniquePlaces(places: FifteenMinuteSection['places']): FifteenMinuteSection['places'] {
  return places.filter(
    (place, index) => places.findIndex((other) => other.id === place.id) === index,
  );
}

export function FifteenMinuteMap({ report, section, selectedKey }: FifteenMinuteMapProps) {
  const { t } = useTranslation('smartCheck');
  const center = reportCenter(report);
  const widest = widestIsochrone(section);
  const selectedPlace = selectedKey === null ? undefined : nearestPlace(section, selectedKey);
  const selectedFamily = selectedKey === null ? null : categoryFamily(section, selectedKey);
  const route = selectedPlace
    ? section.routes.find((candidate) => candidate.place_id === selectedPlace.id)
    : undefined;

  const overlays: MapOverlay[] = [
    ...(widest
      ? [
          {
            id: 'fifteen-zone',
            kind: 'fill' as const,
            colorToken: '--report-fifteen-minute',
            opacity: ZONE_OPACITY,
            outlineWidth: 2,
            isVisible: true,
            data: smoothAreas(areaCollection([widest.geometry])),
          },
        ]
      : []),
    {
      id: 'fifteen-route',
      kind: 'line',
      colorToken: FAMILY_STYLES[selectedFamily ?? 'services'].color,
      width: 4.5,
      hasCasing: true,
      isVisible: route !== undefined,
      data: lineCollection(route ? [decodePolyline6(route.polyline6)] : []),
    },
  ];

  const markers: MapMarkerItem[] = [
    ...uniquePlaces(section.places).map((place) => {
      const family = categoryFamily(section, place.category);
      const isSelected = place.id === selectedPlace?.id;
      return {
        id: place.id,
        position: [place.lng, place.lat] as [number, number],
        anchor: isSelected ? ('left' as const) : ('center' as const),
        isRaised: isSelected,
        node: (
          <PlaceDot
            family={family}
            state={isSelected ? 'selected' : selectedKey === null ? 'normal' : 'dim'}
            {...(isSelected
              ? {
                  label: t('report.chapters.fifteenMinute.map.minutes', { minutes: place.minutes }),
                }
              : {})}
          />
        ),
      };
    }),
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
      label={t('report.chapters.fifteenMinute.map.label')}
      errorLabel={t('report.frame.hero.mapError')}
      center={center}
      zoom={15}
      bounds={placeBounds(center, section)}
      boundsPadding={44}
      hasNavigationControl
      overlays={overlays}
      markers={markers}
    />
  );
}
