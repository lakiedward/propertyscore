import { useTranslation } from 'react-i18next';
import type { LngLat } from '@/components/map/map.config';
import { isochroneOverlays, noiseOverlays } from '../chapter-layers';
import { nearestPerGroup } from '../fifteen-minute-section.utils';
import type { ReportMapLayer } from '../components/report-map';
import type { ReportResult } from '../online-report.types';
import type { ChapterId } from '../online-report.utils';

type ChapterMapLayerInput = {
  chapter: ChapterId;
  result: ReportResult;
  position: LngLat;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isNight: boolean;
};

export function useChapterMapLayer({
  chapter,
  result,
  position,
  selectedId,
  onSelect,
  isNight,
}: ChapterMapLayerInput): ReportMapLayer | undefined {
  const { t } = useTranslation('onlineReports');
  const common = { selectedId, onSelect };

  if (chapter === 'noise' && result.noise?.status === 'scored') {
    return {
      ...common,
      hueKey: 'noise',
      overlays: noiseOverlays(result.noise, position, result.noise.bands_db, isNight),
      places: [],
      radiusM: result.noise.map_radius_m,
      note: t('noise.map.note'),
    };
  }
  if (chapter === 'fifteen_minute' && result.fifteen_minute?.status === 'scored') {
    const section = result.fifteen_minute;
    const largest = Math.max(15, ...section.isochrones.map((isochrone) => isochrone.minutes));
    return {
      ...common,
      hueKey: 'fifteen_minute',
      overlays: isochroneOverlays(section),
      places: nearestPerGroup(section).map((place) => ({
        id: place.id,
        position: [place.lng, place.lat],
        label: t('fifteenMinute.map.place', {
          name: place.name ?? t(`fifteenMinute.category.${place.category}`),
        }),
      })),
      radiusM: Math.round((section.walk_speed_kmh * 1000 * largest) / 60),
      note: t('fifteenMinute.map.note'),
    };
  }
  if (chapter === 'industry' && result.industry?.status === 'scored') {
    return {
      ...common,
      hueKey: 'industry',
      overlays: [],
      places: result.industry.sites.map((site) => ({
        id: site.id,
        position: site.location,
        label: t('industry.map.site', { name: site.name }),
      })),
      radiusM: Math.max(
        result.industry.near_m,
        ...result.industry.sites.map((site) => site.distance_m),
      ),
      note: t('industry.map.note'),
    };
  }
  return undefined;
}
