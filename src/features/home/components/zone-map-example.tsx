import { HouseIcon, MinusIcon, PlusIcon } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MapFeatureCollection, MapMarkerItem, MapOverlay } from '@/components/map/map-canvas';
import { boundsOf, type LngLat } from '@/components/map/map.config';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import {
  ZONE_HOME,
  ZONE_ROUTES,
  ZONE_SAFETY_POINTS,
  ZONE_SAFETY_SCORE,
  ZONE_TRANSIT_LINES,
  ZONE_TRANSIT_STOPS,
  type ZoneCategory,
} from '../data/zone-map-example';
import { CATEGORY_DOT_CLASS } from '../home.categories';

const MapCanvas = lazy(() =>
  import('@/components/map/map-canvas').then((module) => ({ default: module.MapCanvas })),
);

const LAYERS = ['walk', 'transit', 'safety'] as const;
const TRANSIT_FACTS = ['transitStops', 'transitLines', 'transitTime'] as const;
type ZoneLayer = (typeof LAYERS)[number];

const CATEGORY_TOKEN: Readonly<Record<ZoneCategory, string>> = {
  education: '--category-education',
  transport: '--category-transport',
  green: '--category-green',
  health: '--category-health',
  shopping: '--category-shopping',
  safety: '--category-safety',
};

function lineFeature(path: LngLat[]): MapFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: path } },
    ],
  };
}

function pointFeatures(points: LngLat[]): MapFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map((point) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: point },
    })),
  };
}

const LAYER_BOUNDS = {
  walk: boundsOf([ZONE_HOME, ...ZONE_ROUTES.flatMap((route) => route.path)]),
  transit: boundsOf([ZONE_HOME, ...ZONE_TRANSIT_STOPS.map((stop) => stop.position)]),
  safety: boundsOf([ZONE_HOME, ...ZONE_SAFETY_POINTS.map((point) => point.position)]),
};

export function ZoneMapExample() {
  const { t } = useTranslation('home');
  const [layer, setLayer] = useState<ZoneLayer>('walk');
  const [hasMapError, setHasMapError] = useState(false);

  const overlays: MapOverlay[] = [
    ...ZONE_ROUTES.map((route): MapOverlay => ({
      id: `walk-${route.id}`,
      kind: 'line',
      data: lineFeature(route.path),
      colorToken: CATEGORY_TOKEN[route.category],
      width: 4,
      hasCasing: true,
      isVisible: layer === 'walk',
    })),
    ...ZONE_TRANSIT_LINES.map((line): MapOverlay => ({
      id: `transit-${line.line}`,
      kind: 'line',
      data: lineFeature(line.path),
      colorToken: CATEGORY_TOKEN[line.category],
      width: 5,
      hasCasing: true,
      isVisible: layer === 'transit',
    })),
    {
      id: 'safety-up',
      kind: 'circle',
      data: pointFeatures(
        ZONE_SAFETY_POINTS.filter((point) => point.effect === 'up').map((point) => point.position),
      ),
      colorToken: '--map-safety-up',
      radius: 34,
      opacity: 0.22,
      isVisible: layer === 'safety',
    },
    {
      id: 'safety-down',
      kind: 'circle',
      data: pointFeatures(
        ZONE_SAFETY_POINTS.filter((point) => point.effect === 'down').map(
          (point) => point.position,
        ),
      ),
      colorToken: '--map-safety-down',
      radius: 28,
      opacity: 0.22,
      isVisible: layer === 'safety',
    },
  ];

  const markers: MapMarkerItem[] =
    layer === 'walk'
      ? [
          homeMarker(t('smartCheck.map.home')),
          ...ZONE_ROUTES.map((route): MapMarkerItem => ({
            id: `walk-${route.id}`,
            position: route.position,
            anchor: 'left',
            node: (
              <span className="flex items-center gap-1.5 rounded-full bg-card py-1 pr-2.5 pl-1 text-meta whitespace-nowrap text-foreground shadow-md">
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 font-bold text-on-inverse',
                    CATEGORY_DOT_CLASS[toHue(route.category)],
                  )}
                >
                  {t('smartCheck.map.walkMinutes', { minutes: route.minutes })}
                </span>
                {route.name}
              </span>
            ),
          })),
        ]
      : layer === 'transit'
        ? [
            homeMarker(t('smartCheck.map.home')),
            ...ZONE_TRANSIT_STOPS.map((stop): MapMarkerItem => ({
              id: `stop-${stop.name}`,
              position: stop.position,
              anchor: 'left',
              node: (
                <span className="flex flex-col rounded-md bg-card px-2 py-1 text-meta whitespace-nowrap text-foreground shadow-md">
                  <span className="font-bold">{stop.name}</span>
                  <span className="text-muted-foreground">
                    {t('smartCheck.map.stopLines', { lines: stop.lines })}
                  </span>
                </span>
              ),
            })),
          ]
        : [
            {
              id: 'safety-score',
              position: ZONE_HOME,
              node: (
                <span
                  role="img"
                  aria-label={t('smartCheck.map.safetyScore', { score: ZONE_SAFETY_SCORE })}
                  className="grid size-13 place-items-center rounded-full border-4 border-card bg-cta font-heading text-h4 text-cta-foreground shadow-md"
                >
                  {formatNumber(ZONE_SAFETY_SCORE)}
                </span>
              ),
            },
            ...ZONE_SAFETY_POINTS.map((point): MapMarkerItem => ({
              id: `safety-${point.id}`,
              position: point.position,
              anchor: 'center',
              node: (
                <span
                  role="img"
                  aria-label={t('smartCheck.map.safetyPoint', {
                    factor: t(`smartCheck.map.factors.${point.id}`),
                    effect: t(
                      point.effect === 'up'
                        ? 'smartCheck.map.safetyUp'
                        : 'smartCheck.map.safetyDown',
                    ),
                  })}
                  className={cn(
                    'grid size-6.5 place-items-center rounded-full border-2 border-card text-on-inverse shadow-sm',
                    point.effect === 'up' ? 'bg-map-safety-up' : 'bg-map-safety-down',
                  )}
                >
                  {point.effect === 'up' ? (
                    <PlusIcon aria-hidden className="size-3.5" />
                  ) : (
                    <MinusIcon aria-hidden className="size-3.5" />
                  )}
                </span>
              ),
            })),
          ];

  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        type="single"
        value={layer}
        onValueChange={(value) => {
          const next = LAYERS.find((option) => option === value);
          if (next) {
            setLayer(next);
          }
        }}
        aria-label={t('smartCheck.map.layersLabel')}
        className="w-fit flex-wrap gap-1.5 rounded-full bg-on-inverse/8 p-1.25"
      >
        {LAYERS.map((option) => (
          <ToggleGroupItem
            key={option}
            value={option}
            className="h-10 rounded-full px-4 text-small font-bold text-on-info-muted hover:bg-on-inverse/10 hover:text-on-inverse data-[state=on]:bg-card data-[state=on]:text-info-ink"
          >
            {t(`smartCheck.map.layers.${option}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="relative aspect-square max-h-155 min-h-95 w-full overflow-hidden rounded-2xl bg-info-ink-muted">
        {hasMapError ? (
          <p className="grid size-full place-items-center p-6 text-center text-small text-muted-foreground">
            {t('smartCheck.map.error')}
          </p>
        ) : (
          <Suspense fallback={<Skeleton className="size-full rounded-2xl" />}>
            <MapCanvas
              label={t('smartCheck.map.mapLabel')}
              center={ZONE_HOME}
              zoom={16}
              bounds={LAYER_BOUNDS[layer]}
              markers={markers}
              overlays={overlays}
              onError={() => {
                setHasMapError(true);
              }}
              className="size-full"
            />
          </Suspense>
        )}
      </div>
      <ul
        className="flex flex-wrap gap-x-4.5 gap-y-2 text-caption text-on-info-muted"
        aria-live="polite"
      >
        {layer === 'walk'
          ? ZONE_ROUTES.map((route) => (
              <li key={route.id} className="flex items-center gap-1.75">
                <span
                  aria-hidden
                  className={cn('size-2.5 rounded-full', CATEGORY_DOT_CLASS[toHue(route.category)])}
                />
                {route.name}{' '}
                <b className="font-bold text-on-inverse">
                  {t('smartCheck.map.walkMinutes', { minutes: route.minutes })}
                </b>
              </li>
            ))
          : layer === 'transit'
            ? TRANSIT_FACTS.map((key) => (
                <li key={key} className="flex items-center gap-1.75">
                  <span aria-hidden className="size-2.5 rounded-full bg-category-transport" />
                  {t(`smartCheck.map.${key}`)}
                </li>
              ))
            : [
                <li key="up" className="flex items-center gap-1.75">
                  <span aria-hidden className="size-2.5 rounded-full bg-map-safety-up" />
                  {t('smartCheck.map.safetyUp')}
                </li>,
                <li key="down" className="flex items-center gap-1.75">
                  <span aria-hidden className="size-2.5 rounded-full bg-map-safety-down" />
                  {t('smartCheck.map.safetyDown')}
                </li>,
                <li key="score" className="flex items-center gap-1.75">
                  <span aria-hidden className="size-2.5 rounded-full bg-cta" />
                  {t('smartCheck.map.safetyScore', { score: ZONE_SAFETY_SCORE })}
                </li>,
              ]}
      </ul>
    </div>
  );
}

function toHue(category: ZoneCategory) {
  return category === 'safety' ? 'safety' : category;
}

function homeMarker(label: string): MapMarkerItem {
  return {
    id: 'home',
    position: ZONE_HOME,
    anchor: 'center',
    node: (
      <span
        role="img"
        aria-label={label}
        className="grid size-10 place-items-center rounded-full border-4 border-card bg-primary text-primary-foreground shadow-md"
      >
        <HouseIcon aria-hidden className="size-4.5" />
      </span>
    ),
  };
}
