import { useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { MapImageOverlay, MapMarkerItem } from '@/components/map/map-canvas';
import { AddressPin } from '@/components/report/address-pin';
import { ReportMap } from '@/components/report/report-map';
import { boundsAround } from '@/components/report/report-map.utils';
import { addressLabel, reportCenter } from '../../../../report-map.utils';
import type { ReadyReport } from '../../../../report.types';
import { SAFETY_HEAT_OPACITY, heatRaster, rasterDataUrl } from '../../../../safety-heat';
import {
  formatDistanceM,
  mapRadiusM,
  safetyTypeMeta,
  type SafetyLandmark,
  type SafetyWhen,
} from '../../../../safety.utils';

type SafetyMapProps = {
  report: ReadyReport;
  when: SafetyWhen;
  landmarks: readonly SafetyLandmark[];
  hiddenTypes: ReadonlySet<string>;
  focusedType: string | null;
  isHeatVisible: boolean;
};

function LandmarkDot({ type, label }: { type: string; label: string | null }) {
  const meta = safetyTypeMeta(type);
  const Icon = meta.icon;
  return (
    <span
      aria-hidden="true"
      style={{ '--c': `var(${meta.colorVar})` } as CSSProperties}
      className="pointer-events-none flex items-center gap-1.5"
    >
      <span className="grid size-5.5 place-items-center rounded-full border-2 border-card bg-(--c) text-card shadow-report-label">
        <Icon className="size-3" />
      </span>
      {label ? (
        <span className="rounded-full border-2 border-card bg-(--c) px-2 py-0.5 text-meta font-extrabold whitespace-nowrap text-card shadow-report-label">
          {label}
        </span>
      ) : null}
    </span>
  );
}

export function SafetyMap({
  report,
  when,
  landmarks,
  hiddenTypes,
  focusedType,
  isHeatVisible,
}: SafetyMapProps) {
  const { t } = useTranslation('smartCheck');
  const center = reportCenter(report);
  const [longitude, latitude] = center;
  const heat = report.result.sections.safety?.heat;
  const bounds = useMemo(
    () => boundsAround([longitude, latitude], mapRadiusM(landmarks)),
    [longitude, latitude, landmarks],
  );

  const imageOverlays = useMemo<MapImageOverlay[]>(() => {
    if (!heat || heat.cells.length === 0) return [];
    const raster = heatRaster(heat, [longitude, latitude], when);
    const url = rasterDataUrl(raster);
    return url
      ? [
          {
            id: `safety-heat-${when}`,
            url,
            coordinates: raster.coordinates,
            opacity: SAFETY_HEAT_OPACITY,
            isVisible: isHeatVisible,
          },
        ]
      : [];
  }, [heat, longitude, latitude, when, isHeatVisible]);

  const nearestOfFocus = landmarks
    .filter((landmark) => landmark.type === focusedType)
    .sort((a, b) => a.distance_m - b.distance_m)[0];

  const markers: MapMarkerItem[] = [
    ...landmarks
      .filter(
        (landmark) =>
          !hiddenTypes.has(landmark.type) &&
          (focusedType === null || landmark.type === focusedType),
      )
      .map((landmark) => ({
        id: landmark.id,
        position: landmark.location,
        anchor: 'left' as const,
        isRaised: landmark.id === nearestOfFocus?.id,
        node: (
          <LandmarkDot
            type={landmark.type}
            label={landmark.id === nearestOfFocus?.id ? formatDistanceM(landmark.distance_m) : null}
          />
        ),
      })),
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
      label={t('report.chapters.safety.map.label')}
      errorLabel={t('report.frame.hero.mapError')}
      center={center}
      zoom={15}
      bounds={bounds}
      boundsPadding={24}
      hasNavigationControl
      imageOverlays={imageOverlays}
      markers={markers}
    />
  );
}
