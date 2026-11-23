import { useTranslation } from 'react-i18next';
import type { MapMarkerItem, MapOverlay } from '@/components/map/map-canvas';
import { AddressPin } from '@/components/report/address-pin';
import { REPORT_HUES } from '@/components/report/report-hues';
import { ReportMap } from '@/components/report/report-map';
import { boundsAround, lineCollection, ringAround } from '@/components/report/report-map.utils';
import type { LngLat, LngLatBounds } from '@/components/map/map.config';
import { cn } from '@/lib/utils';
import { addressLabel, areaCollection, reportCenter } from '../../../report-map.utils';
import type { ReadyReport } from '../../../report.types';
import { routeEnd, type ZoneLayer, type ZoneRoute } from '../../../zone-map.utils';

const ZONE_MAP_MIN_RADIUS_M = 700;
const RING_RADIUS_M = 500;
const FIFTEEN_MINUTES = 15;

const HUE_TOKENS = {
  summary: '--report-summary',
  safety: '--report-safety',
  accessibility: '--report-accessibility',
  fifteenMinute: '--report-fifteen-minute',
  green: '--report-green',
  noise: '--report-noise',
  air: '--report-air',
  industry: '--report-industry',
  education: '--report-education',
  health: '--report-health',
  context: '--report-context',
} as const;

type ZoneMapProps = {
  report: ReadyReport;
  routes: readonly ZoneRoute[];
  selectedRouteId?: string | null;
  layers: readonly ZoneLayer[];
  hasZoomControls?: boolean;
  className?: string;
};

function routesBounds(center: LngLat, routes: readonly ZoneRoute[]): LngLatBounds {
  const [[minLng, minLat], [maxLng, maxLat]] = boundsAround(center, ZONE_MAP_MIN_RADIUS_M);
  const points = routes.flatMap((route) => route.lines.flat());
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

export function ZoneMap({
  report,
  routes,
  selectedRouteId = null,
  layers,
  hasZoomControls = false,
  className,
}: ZoneMapProps) {
  const { t } = useTranslation('smartCheck');
  const center = reportCenter(report);
  const { green, fifteen_minute: fifteenMinute } = report.result.sections;
  const isochrone = fifteenMinute?.isochrones.find((item) => item.minutes === FIFTEEN_MINUTES);

  const layerOverlays: MapOverlay[] = [
    {
      id: 'zone-green',
      kind: 'fill',
      colorToken: '--report-map-green-area',
      opacity: 0.75,
      outlineWidth: 1,
      isVisible: layers.includes('green'),
      data: areaCollection(green?.areas.features.map((feature) => feature.geometry) ?? []),
    },
    {
      id: 'zone-fifteen',
      kind: 'fill',
      colorToken: '--report-fifteen-minute',
      opacity: 0.14,
      outlineWidth: 1.5,
      isVisible: layers.includes('fifteen'),
      data: areaCollection(isochrone ? [isochrone.geometry] : []),
    },
    {
      id: 'zone-ring',
      kind: 'line',
      colorToken: '--report-green',
      width: 1.5,
      isVisible: layers.includes('ring'),
      data: ringAround(center, RING_RADIUS_M),
    },
  ];

  const routeOverlays: MapOverlay[] = routes.map((route) => ({
    id: `zone-route-${route.id}`,
    kind: 'line',
    colorToken: HUE_TOKENS[route.hue],
    width: selectedRouteId === route.id ? 5.5 : 4,
    hasCasing: true,
    isVisible: selectedRouteId === null || selectedRouteId === route.id,
    data: lineCollection(route.lines),
  }));

  const routeMarkers: MapMarkerItem[] = routes.flatMap((route) => {
    const end = routeEnd(route);
    if (!end || (selectedRouteId !== null && selectedRouteId !== route.id)) return [];
    return [
      {
        id: `zone-label-${route.id}`,
        position: end,
        anchor: 'left',
        isRaised: selectedRouteId === route.id,
        node: (
          <span
            aria-hidden="true"
            className="pointer-events-none -ml-1.5 flex items-center gap-1.5"
          >
            <i
              className={cn(
                'size-3 rounded-full border-2 border-card shadow-report-label',
                REPORT_HUES[route.hue].fill,
              )}
            />
            <span
              className={cn(
                'rounded-full border-2 border-card px-2 py-0.5 text-meta font-extrabold whitespace-nowrap text-on-inverse shadow-report-label',
                REPORT_HUES[route.hue].fill,
              )}
            >
              {t('report.chapters.summary.explorer.minutes', { minutes: route.minutes })}
            </span>
          </span>
        ),
      },
    ];
  });

  const markers: MapMarkerItem[] = [
    ...routeMarkers,
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
      label={t('report.chapters.summary.explorer.mapLabel')}
      errorLabel={t('report.frame.hero.mapError')}
      center={center}
      zoom={14}
      bounds={routesBounds(center, routes)}
      boundsPadding={48}
      hasNavigationControl={hasZoomControls}
      overlays={[...layerOverlays, ...routeOverlays]}
      markers={markers}
      className={className}
    />
  );
}
