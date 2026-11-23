import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { MapImageOverlay, MapMarkerItem, MapOverlay } from '@/components/map/map-canvas';
import { AddressPin } from '@/components/report/address-pin';
import { ReportMap } from '@/components/report/report-map';
import { boundsAround } from '@/components/report/report-map.utils';
import { bandRasterUrl, noiseBandRaster, NOISE_BAND_OPACITY } from '../../../../noise-bands';
import { sourceLinesByColor } from '../../../../noise.utils';
import { addressLabel, reportCenter } from '../../../../report-map.utils';
import type { ReadyReport } from '../../../../report.types';

const FRAME_RADIUS_M = 850;

type NoiseMapProps = {
  report: ReadyReport;
};

export function NoiseMap({ report }: NoiseMapProps) {
  const { t } = useTranslation('smartCheck');
  const center = reportCenter(report);
  const [longitude, latitude] = center;
  const map = report.result.sections.noise?.map;
  const heat = map?.heat;
  const lines = map?.lines;

  const bounds = useMemo(
    () => boundsAround([longitude, latitude], FRAME_RADIUS_M),
    [longitude, latitude],
  );

  const imageOverlays = useMemo<MapImageOverlay[]>(() => {
    if (!heat) return [];
    const raster = noiseBandRaster(heat);
    const url = bandRasterUrl(raster);
    return url
      ? [
          {
            id: 'noise-bands',
            url,
            coordinates: raster.coordinates,
            opacity: NOISE_BAND_OPACITY,
            isVisible: true,
          },
        ]
      : [];
  }, [heat]);

  const overlays = useMemo<MapOverlay[]>(
    () =>
      heat || !lines
        ? []
        : sourceLinesByColor(lines).map(({ color, data }) => ({
            id: `noise-lines-${color}`,
            kind: 'line' as const,
            data,
            colorToken: color,
            width: 4,
            hasCasing: true,
            isVisible: true,
          })),
    [heat, lines],
  );

  const markers: MapMarkerItem[] = [
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
      label={t('report.chapters.noise.map.label')}
      errorLabel={t('report.frame.hero.mapError')}
      center={center}
      zoom={15}
      bounds={bounds}
      boundsPadding={0}
      hasNavigationControl
      hasLabels={false}
      imageOverlays={imageOverlays}
      overlays={overlays}
      markers={markers}
    />
  );
}
