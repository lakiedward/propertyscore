import { useTranslation } from 'react-i18next';
import type { LngLat, LngLatBounds } from '@/components/map/map.config';
import type { MapMarkerItem, MapOverlay } from '@/components/map/map-canvas';
import { AddressPin } from '@/components/report/address-pin';
import { ReportMap } from '@/components/report/report-map';
import { boundsAround, lineCollection } from '@/components/report/report-map.utils';
import { cn } from '@/lib/utils';
import type { DestinationMode, DestinationRow } from '../../../accessibility.utils';
import { addressLabel, reportCenter } from '../../../report-map.utils';
import type { ReadyReport } from '../../../report.types';

const MIN_RADIUS_M = 700;
const WALK_DASH = [0.1, 2.4] as const;
const ROUTE_WIDTH = 4;
const SELECTED_ROUTE_WIDTH = 5.5;
const WALK_WIDTH = 3;

type StopPoint = { id: string; name: string | null; location: LngLat };

type AccessibilityRouteMapProps = {
  report: ReadyReport;
  rows: readonly DestinationRow[];
  stops: readonly StopPoint[];
  selectedId: string | null;
  mode: DestinationMode;
  namedId?: string | null;
  className?: string;
};

function toLngLat(coordinate: readonly number[]): LngLat {
  return [coordinate[0] ?? 0, coordinate[1] ?? 0];
}

function routeBounds(
  center: LngLat,
  rows: readonly DestinationRow[],
  mode: DestinationMode,
): LngLatBounds {
  const [[west, south], [east, north]]: LngLatBounds =
    mode === 'car' && rows.length > 0 ? [center, center] : boundsAround(center, MIN_RADIUS_M);
  let minLng = west;
  let minLat = south;
  let maxLng = east;
  let maxLat = north;
  for (const row of rows) {
    for (const leg of row.path) {
      for (const [lng, lat] of leg.coordinates) {
        minLng = Math.min(minLng, lng);
        minLat = Math.min(minLat, lat);
        maxLng = Math.max(maxLng, lng);
        maxLat = Math.max(maxLat, lat);
      }
    }
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export function AccessibilityRouteMap({
  report,
  rows,
  stops,
  selectedId,
  mode,
  namedId = null,
  className,
}: AccessibilityRouteMapProps) {
  const { t, i18n } = useTranslation('smartCheck');
  const language = i18n.resolvedLanguage === 'en' ? 'en' : 'ro';
  const center = reportCenter(report);
  const isCar = mode === 'car';
  const visibleRows = selectedId === null ? rows : rows.filter((row) => row.id === selectedId);

  const overlays: MapOverlay[] = rows.flatMap((row) => {
    const isVisible = selectedId === null || selectedId === row.id;
    const rides = row.path.filter((leg) => leg.mode !== 'walk');
    const walks = row.path.filter((leg) => leg.mode === 'walk');
    return [
      {
        id: `accessibility-walk-${row.id}`,
        kind: 'line' as const,
        colorToken: row.swatch.token,
        width: WALK_WIDTH,
        dash: WALK_DASH,
        isVisible,
        data: lineCollection(
          walks.map((leg) => leg.coordinates.map((coordinate) => toLngLat(coordinate))),
        ),
      },
      {
        id: `accessibility-${isCar ? 'car' : 'ride'}-${row.id}`,
        kind: 'line' as const,
        colorToken: row.swatch.token,
        width: selectedId === row.id ? SELECTED_ROUTE_WIDTH : ROUTE_WIDTH,
        hasCasing: true,
        isVisible,
        data: lineCollection(
          rides.map((leg) => leg.coordinates.map((coordinate) => toLngLat(coordinate))),
        ),
      },
    ];
  });

  const endMarkers = visibleRows.flatMap<MapMarkerItem>((row) =>
    row.end
      ? [
          {
            id: `accessibility-end-${row.id}`,
            position: row.end,
            anchor: isCar ? 'center' : 'left',
            isRaised: selectedId === row.id,
            node: isCar ? (
              <span
                aria-hidden="true"
                className={cn('block size-3 rounded-full border-2 border-card', row.swatch.fill)}
              />
            ) : (
              <span
                aria-hidden="true"
                className="pointer-events-none -ml-1.5 flex items-center gap-1.5"
              >
                <i
                  className={cn(
                    'size-3 rounded-full border-2 border-card shadow-report-label',
                    row.swatch.fill,
                  )}
                />
                <span
                  className={cn(
                    'rounded-full border-2 border-card px-2 py-0.5 text-meta font-extrabold whitespace-nowrap text-on-inverse shadow-report-label',
                    row.swatch.fill,
                  )}
                >
                  {t('report.chapters.accessibility.minutes', { minutes: row.minutes })}
                </span>
                {row.id === namedId ? (
                  <span className="-ml-2.5 max-w-36 truncate rounded-r-full border-2 border-l-0 border-card bg-card py-0.5 pr-2.5 pl-2 text-meta font-bold whitespace-nowrap text-foreground shadow-report-label w760:max-w-90">
                    {row.label[language]}
                  </span>
                ) : null}
              </span>
            ),
          },
        ]
      : [],
  );

  const stopMarkers: MapMarkerItem[] = stops.map((stop) => ({
    id: `accessibility-stop-${stop.id}`,
    position: stop.location,
    anchor: 'center',
    node: (
      <span
        aria-hidden="true"
        className="pointer-events-none grid size-3.5 place-items-center rounded-[4px] border-2 border-foreground bg-card"
      >
        <i className="size-1.5 rounded-[1.5px] bg-foreground" />
      </span>
    ),
  }));

  const markers: MapMarkerItem[] = [
    ...stopMarkers,
    ...endMarkers,
    {
      id: 'address',
      position: center,
      anchor: isCar ? 'center' : 'bottom',
      isRaised: true,
      node: isCar ? (
        <span
          aria-hidden="true"
          className="block size-3.5 rounded-full border-2 border-card bg-primary"
        />
      ) : (
        <AddressPin label={addressLabel(report.address_text)} />
      ),
    },
  ];

  return (
    <ReportMap
      label={t(
        isCar
          ? 'report.chapters.accessibility.car.mapLabel'
          : 'report.chapters.accessibility.mapLabel',
      )}
      errorLabel={t('report.frame.hero.mapError')}
      center={center}
      zoom={14}
      bounds={routeBounds(center, isCar ? visibleRows : rows, mode)}
      boundsPadding={56}
      hasNavigationControl
      overlays={overlays}
      markers={markers}
      className={className}
    />
  );
}
