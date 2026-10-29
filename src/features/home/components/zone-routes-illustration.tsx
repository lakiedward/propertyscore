import {
  BusIcon,
  HouseIcon,
  ShoppingBagIcon,
  TrainFrontIcon,
  TreesIcon,
  SchoolIcon,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import {
  ILLUSTRATION_BLOCKS,
  ILLUSTRATION_POIS,
  ILLUSTRATION_ROADS,
  ILLUSTRATION_ROUTES,
  ILLUSTRATION_TREES,
} from '../data/zone-routes-illustration';

const FILTERS = ['transport', 'school', 'park', 'shops'] as const;
type RouteFilter = (typeof FILTERS)[number];
const ALL = 'all';

const ROUTE_STROKE: Readonly<Record<RouteFilter, string>> = {
  transport: 'stroke-category-education',
  school: 'stroke-category-health',
  park: 'stroke-category-green',
  shops: 'stroke-category-shopping',
};

const ROUTE_FILL: Readonly<Record<RouteFilter, string>> = {
  transport: 'fill-category-education',
  school: 'fill-category-health',
  park: 'fill-category-green',
  shops: 'fill-category-shopping',
};

const ROUTE_DOT: Readonly<Record<RouteFilter, string>> = {
  transport: 'bg-category-education',
  school: 'bg-category-health',
  park: 'bg-category-green',
  shops: 'bg-category-shopping',
};

const POI_ICON: Readonly<Record<(typeof ILLUSTRATION_POIS)[number]['id'], LucideIcon>> = {
  bus: BusIcon,
  tram: TrainFrontIcon,
  school: SchoolIcon,
  park: TreesIcon,
  shop: ShoppingBagIcon,
};

const STREET_LABELS = [
  { key: 'castanilor', x: 37, y: 281, rotate: 0 },
  { key: 'gradinii', x: 391, y: 115, rotate: 0 },
  { key: 'lalelelor', x: 363, y: 204, rotate: -90 },
  { key: 'livezii', x: 400, y: 356, rotate: 0 },
] as const;

export function ZoneRoutesIllustration() {
  const { t } = useTranslation('home');
  const [filter, setFilter] = useState<RouteFilter | typeof ALL>(ALL);
  const isActive = (route: RouteFilter) => filter === ALL || filter === route;

  return (
    <figure className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-label">{t('deliverables.zone.map.title')}</figcaption>
        <button
          type="button"
          onClick={() => {
            setFilter(ALL);
          }}
          aria-pressed={filter === ALL}
          className="min-h-touch rounded-md px-2 text-small font-bold text-brand underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none aria-pressed:no-underline"
        >
          {t('deliverables.zone.map.all')}
        </button>
      </div>
      <svg
        viewBox="0 0 720 510"
        role="img"
        aria-label={t('deliverables.zone.map.alt')}
        className="w-full overflow-hidden rounded-xl"
      >
        <rect width="720" height="510" className="fill-map-land" />
        <path
          d="M587 54H720V266H590Q581 229 590 194V110Q580 81 587 54Z"
          className="fill-map-park"
        />
        <g className="fill-map-block stroke-map-block-edge" strokeWidth={1.2}>
          {ILLUSTRATION_BLOCKS.map(([x, y, width, height]) => (
            <rect
              key={`${String(x)}-${String(y)}`}
              x={x}
              y={y}
              width={width}
              height={height}
              rx={3}
            />
          ))}
        </g>
        <g className="fill-map-tree">
          {ILLUSTRATION_TREES.map(([cx, cy, r]) => (
            <circle key={`${String(cx)}-${String(cy)}`} cx={cx} cy={cy} r={r} />
          ))}
        </g>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {ILLUSTRATION_ROADS.map(([d, width]) => (
            <path key={`edge-${d}`} d={d} strokeWidth={width} className="stroke-map-road-edge" />
          ))}
          {ILLUSTRATION_ROADS.map(([d, width]) => (
            <path key={`road-${d}`} d={d} strokeWidth={width - 3} className="stroke-card" />
          ))}
        </g>
        <g className="fill-map-label text-meta tracking-wide">
          {STREET_LABELS.map((label) => (
            <text
              key={label.key}
              x={label.x}
              y={label.y}
              transform={
                label.rotate
                  ? `rotate(${String(label.rotate)} ${String(label.x)} ${String(label.y)})`
                  : undefined
              }
            >
              {t(`deliverables.zone.map.streets.${label.key}`)}
            </text>
          ))}
        </g>
        {ILLUSTRATION_ROUTES.map((route) => (
          <g
            key={route.id}
            className={cn(
              'transition-opacity duration-(--duration-base)',
              isActive(route.id) ? 'opacity-100' : 'opacity-15',
            )}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={route.path} strokeWidth={11} className="stroke-card" />
            <path d={route.path} strokeWidth={6} className={ROUTE_STROKE[route.id]} />
          </g>
        ))}
        {ILLUSTRATION_POIS.map((poi) => {
          const Icon = POI_ICON[poi.id];
          return (
            <g
              key={poi.id}
              className={cn(
                'transition-opacity duration-(--duration-base)',
                isActive(poi.route) ? 'opacity-100' : 'opacity-15',
              )}
            >
              <circle
                cx={poi.x}
                cy={poi.y}
                r={21}
                strokeWidth={3}
                className={cn('stroke-card', ROUTE_FILL[poi.route])}
              />
              <Icon
                x={poi.x - 11}
                y={poi.y - 11}
                width={22}
                height={22}
                className="text-on-inverse"
                aria-hidden
              />
              <text
                x={poi.labelX}
                y={poi.labelY}
                textAnchor="middle"
                className={cn('text-label font-bold', ROUTE_FILL[poi.route])}
              >
                {t(`deliverables.zone.map.pois.${poi.id}`)}
              </text>
            </g>
          );
        })}
        <circle cx={350} cy={290} r={34} className="fill-primary/12" />
        <circle cx={350} cy={290} r={24} strokeWidth={4} className="fill-primary stroke-card" />
        <HouseIcon x={338} y={278} width={24} height={24} className="text-on-inverse" aria-hidden />
        <rect x={290} y={325} width={120} height={29} rx={7} className="fill-primary" />
        <text x={350} y={345} textAnchor="middle" className="fill-on-inverse text-label font-bold">
          {t('deliverables.zone.map.home')}
        </text>
      </svg>
      <ToggleGroup
        type="single"
        value={filter === ALL ? '' : filter}
        onValueChange={(value) => {
          setFilter(FILTERS.find((option) => option === value) ?? ALL);
        }}
        aria-label={t('deliverables.zone.map.filterLabel')}
        className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {FILTERS.map((option) => (
          <ToggleGroupItem
            key={option}
            value={option}
            className="h-auto min-h-touch flex-col items-start gap-0.5 rounded-lg border border-border bg-card px-3 py-2 text-left data-[state=on]:border-primary data-[state=on]:bg-surface-alt"
          >
            <span className="flex items-center gap-2 text-small font-bold text-foreground">
              <span aria-hidden className={cn('size-2.5 rounded-full', ROUTE_DOT[option])} />
              {t(`deliverables.zone.map.filters.${option}.name`)}
            </span>
            <span className="text-meta text-muted-foreground">
              {t(`deliverables.zone.map.filters.${option}.text`)}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-caption text-muted-foreground" aria-live="polite">
        {t(`deliverables.zone.map.status.${filter}`)}
      </p>
      <p className="text-caption text-muted-foreground">{t('deliverables.zone.map.caption')}</p>
    </figure>
  );
}
