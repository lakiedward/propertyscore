import { cva } from 'class-variance-authority';
import { HouseIcon, MinusIcon, PlusIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LazyMapCanvas } from '@/components/map/lazy-map-canvas';
import type { MapFeatureCollection, MapMarkerItem, MapOverlay } from '@/components/map/map-canvas';
import type { LngLat } from '@/components/map/map.config';
import { boundsOf } from '@/components/map/map.utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatNumber } from '@/i18n/format';
import { cn, oneOf } from '@/lib/utils';
import { SAMPLE_REPORT } from '../data/sample-report';
import {
  safetyEffectOf,
  ZONE_HOME,
  ZONE_ROUTES,
  ZONE_SAFETY_POINTS,
  ZONE_TRANSIT_LINES,
  ZONE_TRANSIT_STOPS,
  type SafetyEffect,
  type ZoneRoute,
} from '../data/zone-map-example';
import { CATEGORY_STYLE, hueStyle, type HomeHue } from '../home.categories';

const LAYERS = ['walk', 'transit', 'safety'] as const;
type ZoneLayer = (typeof LAYERS)[number];

const TRANSIT_FACTS = [
  { key: 'transitStops', hue: 'sun' },
  { key: 'transitLines', hue: 'coral' },
  { key: 'transitTime', hue: 'slate' },
] as const satisfies readonly { key: string; hue: HomeHue }[];

const SAFETY_SCORE = SAMPLE_REPORT.scores.safety;

const safetyPointVariants = cva(
  'grid size-6.5 place-items-center rounded-full border-2 border-card text-on-inverse shadow-sm',
  { variants: { effect: { up: 'bg-map-safety-up', down: 'bg-map-safety-down' } } },
);

const EFFECT_ICON = { up: PlusIcon, down: MinusIcon } as const satisfies Record<
  SafetyEffect,
  typeof PlusIcon
>;
const EFFECT_KEY = {
  up: 'smartCheck.map.safetyUp',
  down: 'smartCheck.map.safetyDown',
} as const satisfies Record<SafetyEffect, string>;

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

function safetyPositions(effect: SafetyEffect): LngLat[] {
  return ZONE_SAFETY_POINTS.filter((point) => safetyEffectOf(point.factor) === effect).map(
    (point) => point.position,
  );
}

const LAYER_BOUNDS = {
  walk: boundsOf([ZONE_HOME, ...ZONE_ROUTES.flatMap((route) => route.path)]),
  transit: boundsOf([ZONE_HOME, ...ZONE_TRANSIT_STOPS.map((stop) => stop.position)]),
  safety: boundsOf([ZONE_HOME, ...ZONE_SAFETY_POINTS.map((point) => point.position)]),
};

export function ZoneMapExample() {
  const { t } = useTranslation('home');
  const [layer, setLayer] = useState<ZoneLayer>('walk');

  const routeName = (route: ZoneRoute) =>
    route.place ? t(`smartCheck.map.places.${route.place}`, { name: route.name }) : route.name;

  const overlays: MapOverlay[] = [
    ...ZONE_ROUTES.map((route): MapOverlay => ({
      id: `walk-${route.id}`,
      kind: 'line',
      data: lineFeature(route.path),
      colorToken: CATEGORY_STYLE[route.category].token,
      width: 4,
      hasCasing: true,
      isVisible: layer === 'walk',
    })),
    ...ZONE_TRANSIT_LINES.map((line): MapOverlay => ({
      id: `transit-${line.line}`,
      kind: 'line',
      data: lineFeature(line.path),
      colorToken: hueStyle(line.lineTone).token,
      width: 5,
      hasCasing: true,
      isVisible: layer === 'transit',
    })),
    {
      id: 'safety-up',
      kind: 'circle',
      data: pointFeatures(safetyPositions('up')),
      colorToken: '--map-safety-up',
      radius: 34,
      opacity: 0.22,
      isVisible: layer === 'safety',
    },
    {
      id: 'safety-down',
      kind: 'circle',
      data: pointFeatures(safetyPositions('down')),
      colorToken: '--map-safety-down',
      radius: 28,
      opacity: 0.22,
      isVisible: layer === 'safety',
    },
  ];

  const walkMarkers: MapMarkerItem[] = [
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
              CATEGORY_STYLE[route.category].dot,
            )}
          >
            {t('smartCheck.map.walkMinutes', { minutes: route.minutes })}
          </span>
          {routeName(route)}
        </span>
      ),
    })),
  ];

  const transitMarkers: MapMarkerItem[] = [
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
  ];

  const safetyMarkers: MapMarkerItem[] = [
    {
      id: 'safety-score',
      position: ZONE_HOME,
      node: (
        <span
          role="img"
          aria-label={t('smartCheck.map.safetyScore', { score: SAFETY_SCORE })}
          className="grid size-13 place-items-center rounded-full border-4 border-card bg-cta font-heading text-h4 text-cta-foreground shadow-md"
        >
          {formatNumber(SAFETY_SCORE)}
        </span>
      ),
    },
    ...ZONE_SAFETY_POINTS.map((point): MapMarkerItem => {
      const effect = safetyEffectOf(point.factor);
      const Icon = EFFECT_ICON[effect];
      return {
        id: `safety-${point.factor}`,
        position: point.position,
        anchor: 'center',
        node: (
          <span
            role="img"
            aria-label={t('smartCheck.map.safetyPoint', {
              factor: t(`smartCheck.map.factors.${point.factor}`),
              effect: t(EFFECT_KEY[effect]),
            })}
            className={safetyPointVariants({ effect })}
          >
            <Icon aria-hidden className="size-3.5" />
          </span>
        ),
      };
    }),
  ];

  const markers = { walk: walkMarkers, transit: transitMarkers, safety: safetyMarkers }[layer];

  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        type="single"
        value={layer}
        onValueChange={(value) => {
          const next = oneOf(LAYERS, value);
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
            className="touch-target h-10 rounded-full px-4 text-small font-bold text-on-info-muted hover:bg-on-inverse/10 hover:text-on-inverse data-[state=on]:bg-card data-[state=on]:text-info-ink"
          >
            {t(`smartCheck.map.layers.${option}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="relative aspect-square max-h-155 min-h-95 w-full overflow-hidden rounded-2xl bg-info-ink-muted">
        <LazyMapCanvas
          label={t('smartCheck.map.mapLabel')}
          center={ZONE_HOME}
          zoom={16}
          bounds={LAYER_BOUNDS[layer]}
          markers={markers}
          overlays={overlays}
          className="size-full"
          fallbackClassName="size-full rounded-2xl"
          errorFallback={
            <p className="grid size-full place-items-center p-6 text-center text-small text-muted-foreground">
              {t('smartCheck.map.error')}
            </p>
          }
        />
      </div>
      <ul
        className="flex flex-wrap gap-x-4.5 gap-y-2 text-caption text-on-info-muted"
        aria-live="polite"
      >
        {layer === 'walk'
          ? ZONE_ROUTES.map((route) => (
              <LegendItem key={route.id} dotClassName={CATEGORY_STYLE[route.category].dot}>
                {routeName(route)}{' '}
                <b className="font-bold text-on-inverse">
                  {t('smartCheck.map.walkMinutes', { minutes: route.minutes })}
                </b>
              </LegendItem>
            ))
          : null}
        {layer === 'transit'
          ? TRANSIT_FACTS.map((fact) => (
              <LegendItem key={fact.key} dotClassName={hueStyle(fact.hue).dot}>
                {t(`smartCheck.map.${fact.key}`)}
              </LegendItem>
            ))
          : null}
        {layer === 'safety' ? (
          <>
            <LegendItem dotClassName="bg-map-safety-up">{t('smartCheck.map.safetyUp')}</LegendItem>
            <LegendItem dotClassName="bg-map-safety-down">
              {t('smartCheck.map.safetyDown')}
            </LegendItem>
            <LegendItem dotClassName="bg-cta">
              {t('smartCheck.map.safetyScore', { score: SAFETY_SCORE })}
            </LegendItem>
          </>
        ) : null}
      </ul>
    </div>
  );
}

type LegendItemProps = { dotClassName: string; children: ReactNode };

function LegendItem({ dotClassName, children }: LegendItemProps) {
  return (
    <li className="flex items-center gap-1.75">
      <span aria-hidden className={cn('size-2.5 rounded-full', dotClassName)} />
      {children}
    </li>
  );
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
