import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { MapMarkerItem, MapOverlay } from '@/components/map/map-canvas';
import { AddressPin } from '@/components/report/address-pin';
import { ReportMap } from '@/components/report/report-map';
import { cn } from '@/lib/utils';
import { areasOf, framingBounds, type GreenPark } from '../../../../green.utils';
import { addressLabel, reportCenter } from '../../../../report-map.utils';
import type { ReadyReport } from '../../../../report.types';

type GreenMapProps = {
  report: ReadyReport;
  parks: readonly GreenPark[];
  selectedId: string | null;
};

export function GreenMap({ report, parks, selectedId }: GreenMapProps) {
  const { t } = useTranslation('smartCheck');
  const center = reportCenter(report);
  const [longitude, latitude] = center;
  const section = report.result.sections.green;

  const bounds = useMemo(
    () => framingBounds([[longitude, latitude], ...parks.map((park) => park.center)]),
    [longitude, latitude, parks],
  );

  const overlays = useMemo<MapOverlay[]>(() => {
    if (!section) return [];
    const all = areasOf(
      section,
      parks.map((park) => park.id),
    );
    return [
      {
        id: 'green-areas',
        kind: 'fill',
        data: all,
        colorToken: '--ps-leaf-300',
        opacity: 0.75,
        isVisible: true,
      },
      {
        id: 'green-selected',
        kind: 'fill',
        data: areasOf(section, selectedId === null ? [] : [selectedId]),
        colorToken: '--ps-leaf-800',
        opacity: 0.55,
        isVisible: selectedId !== null,
      },
    ];
  }, [section, parks, selectedId]);

  const markers: MapMarkerItem[] = [
    ...parks.map((park, index) => ({
      id: park.id,
      position: park.center,
      anchor: 'center' as const,
      isRaised: park.id === selectedId,
      node: (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none grid size-6.5 place-items-center rounded-full border-2 border-card bg-report-green text-[13px] font-extrabold text-card shadow-report-label transition-opacity duration-(--duration-fast)',
            selectedId !== null && park.id !== selectedId && 'opacity-30',
          )}
        >
          {index + 1}
        </span>
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
      label={t('report.chapters.green.map.label')}
      errorLabel={t('report.frame.hero.mapError')}
      center={center}
      zoom={15}
      bounds={bounds}
      boundsPadding={32}
      hasNavigationControl
      overlays={overlays}
      markers={markers}
    />
  );
}
