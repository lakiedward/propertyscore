import { useTranslation } from 'react-i18next';
import type { LngLat, LngLatBounds } from '@/components/map/map.config';
import type { MapMarkerItem, MapOverlay } from '@/components/map/map-canvas';
import { ReportMap } from '@/components/report/report-map';
import { boundsAround } from '@/components/report/report-map.utils';
import { REACH_MINUTES, type ReachShare } from '../../../accessibility.utils';
import { areaCollection, reportCenter } from '../../../report-map.utils';
import type { ReadyReport } from '../../../report.types';
import type { AccessibilitySection } from '../../../sections/accessibility.types';

const BAND_TOKENS: Readonly<Record<ReachShare['minutes'], string>> = {
  15: '--report-accessibility',
  30: '--warning-fill',
  45: '--category-transport-fill',
};
const LABELLED_NEIGHBOURHOODS = 8;
const FALLBACK_RADIUS_M = 3000;
const BOUNDS_MARGIN = 0.08;

type AccessibilityReachMapProps = {
  report: ReadyReport;
  reach: NonNullable<AccessibilitySection['reach']>;
  minutes: ReachShare['minutes'];
};

function coordinatesOf(geometry: unknown): LngLat[] {
  if (!Array.isArray(geometry)) return [];
  if (typeof geometry[0] === 'number' && typeof geometry[1] === 'number') {
    return [[geometry[0], geometry[1]]];
  }
  return geometry.flatMap((item: unknown) => coordinatesOf(item));
}

function reachBounds(center: LngLat, reach: AccessibilityReachMapProps['reach']): LngLatBounds {
  const outer = reach.isochrones.find((item) => item.minutes === REACH_MINUTES[2]);
  const points = outer
    ? coordinatesOf((outer.geometry as { coordinates?: unknown }).coordinates)
    : [];
  if (points.length === 0) return boundsAround(center, FALLBACK_RADIUS_M);
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  const padLng = (Math.max(...lngs) - Math.min(...lngs)) * BOUNDS_MARGIN;
  const padLat = (Math.max(...lats) - Math.min(...lats)) * BOUNDS_MARGIN;
  return [
    [Math.min(...lngs) - padLng, Math.min(...lats) - padLat],
    [Math.max(...lngs) + padLng, Math.max(...lats) + padLat],
  ];
}

export function AccessibilityReachMap({ report, reach, minutes }: AccessibilityReachMapProps) {
  const { t } = useTranslation('smartCheck');
  const center = reportCenter(report);

  const overlays: MapOverlay[] = [...REACH_MINUTES].reverse().map((band) => ({
    id: `accessibility-reach-${band}`,
    kind: 'fill',
    colorToken: BAND_TOKENS[band],
    opacity: 0.55,
    outlineWidth: 1.5,
    isVisible: band <= minutes,
    data: areaCollection(
      reach.isochrones.filter((item) => item.minutes === band).map((item) => item.geometry),
    ),
  }));

  const neighbourhoods = reach.neighbourhoods
    .flatMap((item) =>
      item.minutes !== null && item.minutes > 0
        ? [{ name: item.name, location: item.location, minutes: item.minutes }]
        : [],
    )
    .sort((left, right) => left.minutes - right.minutes)
    .slice(0, LABELLED_NEIGHBOURHOODS);

  const markers: MapMarkerItem[] = [
    ...neighbourhoods.map((item) => ({
      id: `accessibility-reach-${item.name}`,
      position: item.location,
      anchor: 'center' as const,
      node: (
        <span
          aria-hidden="true"
          data-reached={item.minutes <= minutes}
          className="group pointer-events-none grid justify-items-center gap-0.5 text-[9px] leading-none font-bold text-muted-foreground opacity-55 [text-shadow:0_0_3px_var(--card),0_0_3px_var(--card),0_0_3px_var(--card)] data-[reached=true]:text-foreground data-[reached=true]:opacity-100 w760:text-[10.5px]"
        >
          <span>{item.name}</span>
          <i className="size-1.75 rounded-full border-[1.5px] border-foreground bg-card" />
          <b className="font-extrabold group-data-[reached=true]:text-report-accessibility">
            {t('report.chapters.accessibility.minutes', { minutes: item.minutes })}
          </b>
        </span>
      ),
    })),
    {
      id: 'address',
      position: center,
      anchor: 'center',
      isRaised: true,
      node: (
        <span
          aria-hidden="true"
          className="pointer-events-none grid size-4.5 place-items-center rounded-full border-[3px] border-foreground bg-card"
        >
          <i className="size-1.5 rounded-full bg-foreground" />
        </span>
      ),
    },
  ];

  return (
    <ReportMap
      label={t('report.chapters.accessibility.reach.mapLabel')}
      errorLabel={t('report.frame.hero.mapError')}
      center={center}
      zoom={12}
      bounds={reachBounds(center, reach)}
      boundsPadding={16}
      hasNavigationControl={false}
      overlays={overlays}
      markers={markers}
    />
  );
}
