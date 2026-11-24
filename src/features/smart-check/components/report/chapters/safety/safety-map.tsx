import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { LngLat } from '@/components/map/map.config';
import type { MapImageOverlay, MapMarkerItem } from '@/components/map/map-canvas';
import { AddressPin } from '@/components/report/address-pin';
import { ReportMap } from '@/components/report/report-map';
import { boundsAround } from '@/components/report/report-map.utils';
import { addressLabel, reportCenter } from '../../../../report-map.utils';
import type { ReadyReport } from '../../../../report.types';
import { SAFETY_HEAT_OPACITY, heatRaster, rasterDataUrl } from '../../../../safety-heat';
import { safetyElementOverlays, safetyFocusOverlays } from '../../../../safety-map-layers';
import {
  chipOfType,
  formatDistanceM,
  ICON_ELEMENT_TYPES,
  mapRadiusM,
  midpoint,
  nearestElement,
  safetyTypeMeta,
  type SafetyLandmark,
  type SafetyWhen,
} from '../../../../safety.utils';

const FOCUS_HEAT_OPACITY = 0.45;
const DIMMED_MARKER_OPACITY = 0.1;

type SafetyMapProps = {
  report: ReadyReport;
  when: SafetyWhen;
  landmarks: readonly SafetyLandmark[];
  hiddenTypes: ReadonlySet<string>;
  focusedType: string | null;
  isHeatVisible: boolean;
};

function LandmarkDot({ type, isDimmed }: { type: string; isDimmed: boolean }) {
  const meta = safetyTypeMeta(type);
  const Icon = meta.icon;
  return (
    <span
      aria-hidden="true"
      style={
        {
          '--c': `var(${meta.colorVar})`,
          opacity: isDimmed ? DIMMED_MARKER_OPACITY : 1,
        } as CSSProperties
      }
      className="pointer-events-none grid size-5.5 place-items-center rounded-full border-2 border-card bg-(--c) text-card shadow-report-label transition-opacity duration-(--duration-fast)"
    >
      <Icon className="size-3" />
    </span>
  );
}

function DistanceLabel({ type, label }: { type: string; label: string }) {
  const meta = safetyTypeMeta(type);
  return (
    <span
      aria-hidden="true"
      style={{ '--c': `var(${meta.colorVar})` } as CSSProperties}
      className="pointer-events-none rounded-full border-2 border-card bg-(--c) px-2 py-0.5 text-meta font-extrabold whitespace-nowrap text-card shadow-report-label"
    >
      {label}
    </span>
  );
}

type SafetyHeat = NonNullable<NonNullable<ReadyReport['result']['sections']['safety']>['heat']>;

function heatImage(heat: SafetyHeat | undefined, origin: LngLat, when: SafetyWhen) {
  if (!heat || heat.cells.length === 0) return null;
  const raster = heatRaster(heat, origin, when);
  const url = rasterDataUrl(raster);
  return url ? { url, coordinates: raster.coordinates } : null;
}

type IconPoint = { id: string; type: string; position: LngLat };

function iconPoints(
  landmarks: readonly SafetyLandmark[],
  points: Readonly<Record<string, readonly LngLat[]>> | undefined,
): IconPoint[] {
  if (!points) {
    return landmarks.map((landmark) => ({
      id: landmark.id,
      type: landmark.type,
      position: landmark.location,
    }));
  }
  return Object.entries(points).flatMap(([type, positions]) =>
    ICON_ELEMENT_TYPES.has(type)
      ? positions.map((position, index) => ({ id: `${type}-${String(index)}`, type, position }))
      : [],
  );
}

export function SafetyMap({
  report,
  when,
  landmarks,
  hiddenTypes,
  focusedType: focusedRow,
  isHeatVisible,
}: SafetyMapProps) {
  const { t } = useTranslation('smartCheck');
  const center = reportCenter(report);
  const [longitude, latitude] = center;
  const safety = report.result.sections.safety;
  const focusedType = focusedRow === null ? null : chipOfType(focusedRow);
  const heat = safety?.heat;
  const bounds = boundsAround([longitude, latitude], mapRadiusM(landmarks));

  const heatUrl = heatImage(heat, [longitude, latitude], when);
  const imageOverlays: MapImageOverlay[] = heatUrl
    ? [
        {
          id: `safety-heat-${when}`,
          url: heatUrl.url,
          coordinates: heatUrl.coordinates,
          opacity: focusedType === null ? SAFETY_HEAT_OPACITY : FOCUS_HEAT_OPACITY,
          isVisible: isHeatVisible,
        },
      ]
    : [];

  const elements = safety?.elements;
  const nearest =
    safety && focusedType !== null ? nearestElement(safety, focusedType, center) : null;
  const overlays = [
    ...(elements
      ? safetyElementOverlays(elements, {
          when,
          hiddenChips: hiddenTypes,
          focusedChip: focusedType,
        })
      : []),
    ...(focusedType === null
      ? []
      : safetyFocusOverlays(center, focusedType, elements?.reach_m[focusedType], nearest)),
  ];

  const distanceLabel: MapMarkerItem[] =
    focusedType !== null && focusedType !== 'lighting' && nearest
      ? [
          {
            id: `safety-distance-${focusedType}`,
            position: midpoint(center, nearest.position),
            anchor: 'center',
            isRaised: true,
            node: <DistanceLabel type={focusedType} label={formatDistanceM(nearest.distanceM)} />,
          },
        ]
      : [];

  const markers: MapMarkerItem[] = [
    ...iconPoints(landmarks, elements?.points)
      .filter((point) => !hiddenTypes.has(chipOfType(point.type)))
      .map((point) => ({
        id: point.id,
        position: point.position,
        anchor: 'center' as const,
        node: (
          <LandmarkDot
            type={point.type}
            isDimmed={focusedType !== null && chipOfType(point.type) !== focusedType}
          />
        ),
      })),
    ...distanceLabel,
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
      overlays={overlays}
      markers={markers}
    />
  );
}
