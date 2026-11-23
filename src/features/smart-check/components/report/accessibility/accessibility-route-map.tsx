import { useTranslation } from 'react-i18next';
import type { LngLat, LngLatBounds } from '@/components/map/map.config';
import type { MapMarkerItem, MapOverlay } from '@/components/map/map-canvas';
import { AddressPin } from '@/components/report/address-pin';
import { ReportMap } from '@/components/report/report-map';
import { boundsAround, lineCollection } from '@/components/report/report-map.utils';
import { cn } from '@/lib/utils';
import type { DestinationRow } from '../../../accessibility.utils';
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
  className?: string;
};

function toLngLat(coordinate: readonly number[]): LngLat {
  return [coordinate[0] ?? 0, coordinate[1] ?? 0];
}

function routeBounds(center: LngLat, rows: readonly DestinationRow[]): LngLatBounds {
  const [[minLng, minLat], [maxLng, maxLat]] = boundsAround(center, MIN_RADIUS_M);
  const points = rows.flatMap((row) =>
    row.path.flatMap((leg) => leg.coordinates.map((coordinate) => toLngLat(coordinate))),
  );
  return [
    [
      Math.min(minLng, ...points.map(([lng]) => lng)),
      Math.min(minLat, ...points.map(([, lat]) => lat)),
    ],
    [
      Math.max(maxLng, ...points.map(([lng]) => lng)),
      Math.max(maxLat, ...points.map(([, lat]) => lat)),
    ],
  ];
}

export function AccessibilityRouteMap({
  report,
  rows,
  stops,
  selectedId,
  className,
}: AccessibilityRouteMapProps) {
  const { t } = useTranslation('smartCheck');
  const center = reportCenter(report);

  const overlays: MapOverlay[] = rows.flatMap((row) => {
    const isVisible = selectedId === null || selectedId === row.id;
    const rides = row.path.filter((leg) => leg.mode === 'transit');
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
        id: `accessibility-ride-${row.id}`,
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

  const endMarkers: MapMarkerItem[] = rows.flatMap((row) =>
    row.end && (selectedId === null || selectedId === row.id)
      ? [
          {
            id: `accessibility-end-${row.id}`,
            position: row.end,
            anchor: 'left' as const,
            isRaised: selectedId === row.id,
            node: (
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
      anchor: 'bottom',
      isRaised: true,
      node: <AddressPin label={addressLabel(report.address_text)} />,
    },
  ];

  return (
    <ReportMap
      label={t('report.chapters.accessibility.mapLabel')}
      errorLabel={t('report.frame.hero.mapError')}
      center={center}
      zoom={14}
      bounds={routeBounds(center, rows)}
      boundsPadding={56}
      hasNavigationControl
      overlays={overlays}
      markers={markers}
      className={className}
    />
  );
}
