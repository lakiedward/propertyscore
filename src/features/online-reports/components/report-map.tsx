import { HouseIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LazyMapCanvas } from '@/components/map/lazy-map-canvas';
import type { MapMarkerItem, MapOverlay } from '@/components/map/map-canvas';
import type { LngLat } from '@/components/map/map.config';
import { circleRing } from '../online-report.utils';

const RING_RADII_M = [500, 1000] as const;

type ReportMapProps = {
  position: LngLat;
};

export function ReportMap({ position }: ReportMapProps) {
  const { t } = useTranslation('onlineReports');

  const markers: MapMarkerItem[] = [
    {
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
    },
  ];

  const overlays: MapOverlay[] = RING_RADII_M.map((radius, index) => ({
    id: `ring-${String(radius)}`,
    kind: 'line',
    colorToken: index === 0 ? '--info' : '--info-ink-muted',
    width: index === 0 ? 2.5 : 1.5,
    isVisible: true,
    data: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { radius: String(radius) },
          geometry: { type: 'LineString', coordinates: circleRing(position, radius) },
        },
      ],
    },
  }));

  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative h-80 overflow-hidden rounded-xl border border-border bg-category-education-surface lg:h-[min(640px,calc(100svh-12rem))]">
        <LazyMapCanvas
          label={t('map.label')}
          center={position}
          zoom={14}
          markers={markers}
          overlays={overlays}
          className="size-full"
          fallbackClassName="size-full rounded-xl"
          errorFallback={
            <p className="grid size-full place-items-center p-6 text-center text-small text-muted-foreground">
              {t('map.unavailable')}
            </p>
          }
        />
      </div>
      <p className="text-meta text-muted-foreground">{t('map.note')}</p>
    </div>
  );
}
