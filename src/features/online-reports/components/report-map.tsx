import { HouseIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LazyMapCanvas } from '@/components/map/lazy-map-canvas';
import type { MapFeatureCollection, MapMarkerItem, MapOverlay } from '@/components/map/map-canvas';
import type { LngLat } from '@/components/map/map.config';
import { cn } from '@/lib/utils';
import { useRadiusLabel } from '../hooks/use-radius-label';
import { circleRing } from '../online-report.utils';
import type { GreenPark, ScoredGreenSection } from '../online-report.types';

const RING_RADII_M = [500, 1000] as const;

type ReportMapGreenLayer = {
  areas: ScoredGreenSection['areas'];
  parks: readonly GreenPark[];
  radiusM: number;
  selectedParkId: string | null;
  onSelectPark: (parkId: string) => void;
};

type ReportMapProps = {
  position: LngLat;
  green?: ReportMapGreenLayer | undefined;
};

function ringOverlay(id: string, position: LngLat, radiusM: number): MapFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { id, radius: String(radiusM) },
        geometry: { type: 'LineString', coordinates: circleRing(position, radiusM) },
      },
    ],
  };
}

function greenOverlays(position: LngLat, green: ReportMapGreenLayer): MapOverlay[] {
  const selected = green.areas.features.filter(
    (feature) => feature.properties.id === green.selectedParkId,
  );
  return [
    {
      id: 'green-areas',
      kind: 'fill',
      colorToken: '--category-green-fill',
      opacity: 0.45,
      outlineWidth: 1,
      isVisible: true,
      data: green.areas,
    },
    {
      id: 'green-selected',
      kind: 'fill',
      colorToken: '--category-green',
      opacity: 0.5,
      outlineWidth: 2.5,
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

export function ReportMap({ position, green }: ReportMapProps) {
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

  const selectedPark = green?.parks.find((park) => park.id === green.selectedParkId);
  const selectedIndex = green?.parks.findIndex((park) => park.id === green.selectedParkId) ?? -1;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative h-80 overflow-hidden rounded-xl border border-border bg-category-education-surface lg:h-[min(640px,calc(100svh-12rem))]">
        <LazyMapCanvas
          label={t('map.label')}
          center={position}
          zoom={green ? 14.5 : 14}
          markers={[...parkMarkers, addressMarker]}
          overlays={green ? greenOverlays(position, green) : zoneOverlays(position)}
          focus={
            selectedPark ? { position: selectedPark.center, requestId: selectedIndex } : undefined
          }
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
        {green ? t('green.map.note', { radius: radiusLabel(green.radiusM) }) : t('map.note')}
      </p>
    </div>
  );
}
