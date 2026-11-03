import { HouseIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LazyMapCanvas } from '@/components/map/lazy-map-canvas';
import type { MapMarkerItem, MapOverlay } from '@/components/map/map-canvas';
import type { LngLat, LngLatBounds } from '@/components/map/map.config';
import { cn } from '@/lib/utils';
import { useRadiusLabel } from '../hooks/use-radius-label';
import { ringOverlay } from '../chapter-layers.utils';
import { circleRing } from '../online-report.utils';
import type { GreenPark, ScoredGreenSection } from '../online-report.types';
import type { CategoryKey } from '../online-report.utils';
import { categoryClasses } from './category-style';

const RING_RADII_M = [500, 1000] as const;

type ReportMapGreenLayer = {
  areas: ScoredGreenSection['areas'];
  parks: readonly GreenPark[];
  radiusM: number;
  selectedParkId: string | null;
  onSelectPark: (parkId: string) => void;
};

type ReportMapPlace = {
  id: string;
  position: LngLat;
  label: string;
};

export type ReportMapLayer = {
  hueKey: CategoryKey;
  overlays: readonly MapOverlay[];
  places: readonly ReportMapPlace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  radiusM: number | null;
  note: string;
};

type ReportMapProps = {
  position: LngLat;
  green?: ReportMapGreenLayer | undefined;
  layer?: ReportMapLayer | undefined;
};

function pointsBounds(points: readonly LngLat[]): LngLatBounds {
  const longitudes = points.map(([longitude]) => longitude);
  const latitudes = points.map(([, latitude]) => latitude);
  return [
    [Math.min(...longitudes), Math.min(...latitudes)],
    [Math.max(...longitudes), Math.max(...latitudes)],
  ];
}

function ringBounds(position: LngLat, radiusM: number): LngLatBounds {
  return pointsBounds(circleRing(position, radiusM, 36));
}

function greenOverlays(position: LngLat, green: ReportMapGreenLayer): MapOverlay[] {
  const selected = green.areas.features.filter(
    (feature) => feature.properties.id === green.selectedParkId,
  );
  return [
    {
      id: 'green-areas',
      kind: 'fill',
      colorToken: '--category-green',
      opacity: 0.3,
      outlineWidth: 1.25,
      isVisible: true,
      data: green.areas,
    },
    {
      id: 'green-selected',
      kind: 'fill',
      colorToken: '--category-green',
      opacity: 0.6,
      outlineWidth: 3,
      isVisible: selected.length > 0,
      data: { type: 'FeatureCollection', features: selected },
    },
    {
      id: 'green-ring',
      kind: 'line',
      colorToken: '--category-green',
      width: 2.5,
      hasCasing: true,
      isVisible: true,
      data: ringOverlay('green-ring', position, green.radiusM),
    },
  ];
}

function zoneOverlays(position: LngLat): MapOverlay[] {
  return RING_RADII_M.map((radius, index) => ({
    id: `ring-${String(radius)}`,
    kind: 'line',
    colorToken: index === 0 ? '--info' : '--info-ink-muted',
    width: index === 0 ? 2.5 : 1.5,
    isVisible: true,
    data: ringOverlay(`ring-${String(radius)}`, position, radius),
  }));
}

export function ReportMap({ position, green, layer }: ReportMapProps) {
  const { t } = useTranslation('onlineReports');
  const radiusLabel = useRadiusLabel();

  const addressMarker: MapMarkerItem = {
    id: 'address',
    position,
    anchor: 'center',
    node: (
      <span
        role="img"
        aria-label={t('map.address')}
        className="grid size-10 place-items-center rounded-full border-4 border-card bg-info text-info-foreground shadow-md"
      >
        <HouseIcon aria-hidden className="size-4.5" />
      </span>
    ),
  };

  const parkMarkers: MapMarkerItem[] = (green?.parks ?? []).map((park, index) => {
    const isSelected = park.id === green?.selectedParkId;
    return {
      id: `park-${park.id}`,
      position: park.center,
      anchor: 'center',
      node: (
        <button
          type="button"
          aria-pressed={isSelected}
          aria-label={t('green.map.park', { name: park.name ?? t('green.parks.unnamed') })}
          onClick={() => {
            green?.onSelectPark(park.id);
          }}
          className={cn(
            'grid size-7 place-items-center rounded-full border-2 border-card text-meta font-extrabold tabular-nums shadow-sm',
            isSelected
              ? 'scale-125 bg-category-green text-on-inverse'
              : 'bg-category-green-surface text-category-green',
          )}
        >
          {index + 1}
        </button>
      ),
    };
  });

  const layerHue = layer ? categoryClasses(layer.hueKey) : undefined;
  const layerMarkers: MapMarkerItem[] = (layer?.places ?? []).map((place, index) => {
    const isSelected = place.id === layer?.selectedId;
    return {
      id: `place-${place.id}`,
      position: place.position,
      anchor: 'center',
      node: (
        <button
          type="button"
          aria-pressed={isSelected}
          aria-label={place.label}
          onClick={() => {
            layer?.onSelect(place.id);
          }}
          className={cn(
            'grid size-7 place-items-center rounded-full border-2 border-card text-meta font-extrabold tabular-nums shadow-sm',
            isSelected ? cn('scale-125 text-on-inverse', layerHue?.fill) : layerHue?.tile,
          )}
        >
          {index + 1}
        </button>
      ),
    };
  });
  const selectedPlaceIndex =
    layer?.places.findIndex((place) => place.id === layer.selectedId) ?? -1;
  const selectedPlace = layer?.places[selectedPlaceIndex];
  const layerRadiusM = layer?.radiusM ?? null;

  const selectedPark = green?.parks.find((park) => park.id === green.selectedParkId);
  const selectedIndex = green?.parks.findIndex((park) => park.id === green.selectedParkId) ?? -1;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative h-80 overflow-hidden rounded-xl border border-border bg-category-education-surface lg:h-[min(640px,calc(100svh-12rem))]">
        <LazyMapCanvas
          label={t('map.label')}
          center={position}
          zoom={green || layer ? 14.5 : 14}
          bounds={
            green
              ? ringBounds(position, green.radiusM)
              : layerRadiusM !== null
                ? ringBounds(position, layerRadiusM)
                : layer && layer.places.length > 0
                  ? pointsBounds([position, ...layer.places.map((place) => place.position)])
                  : undefined
          }
          markers={[...parkMarkers, ...layerMarkers, addressMarker]}
          overlays={
            green ? greenOverlays(position, green) : layer ? layer.overlays : zoneOverlays(position)
          }
          focus={
            selectedPark
              ? { position: selectedPark.center, requestId: selectedIndex }
              : selectedPlace
                ? { position: selectedPlace.position, requestId: selectedPlaceIndex }
                : undefined
          }
          isPrintable
          className="size-full"
          fallbackClassName="size-full rounded-xl"
          errorFallback={
            <p className="grid size-full place-items-center p-6 text-center text-small text-muted-foreground">
              {t('map.unavailable')}
            </p>
          }
        />
      </div>
      <p className="text-meta text-muted-foreground">
        {green
          ? t('green.map.note', { radius: radiusLabel(green.radiusM) })
          : (layer?.note ?? t('map.note'))}
      </p>
    </div>
  );
}
