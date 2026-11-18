import { LocateFixedIcon, Maximize2Icon, Minimize2Icon, MinusIcon, PlusIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const ZOOM_BUTTON_CLASS =
  'grid size-12 place-items-center bg-card text-brand transition-colors duration-(--duration-fast) hover:bg-surface-alt focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset';

type ListingsMapControlsProps = {
  isFullScreen: boolean;
  onFullScreenToggle: () => void;
  onShowRomania: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function ListingsMapControls({
  isFullScreen,
  onFullScreenToggle,
  onShowRomania,
  onZoomIn,
  onZoomOut,
}: ListingsMapControlsProps) {
  const { t } = useTranslation('listings');

  return (
    <>
      <div className="absolute top-3.5 right-3.5 z-10 flex flex-col items-end gap-2.5 max-w760:top-auto max-w760:bottom-35">
        <MapControlButton
          label={
            isFullScreen ? t('explore.controls.exitFullScreen') : t('explore.controls.fullScreen')
          }
          isPressed={isFullScreen}
          onClick={onFullScreenToggle}
        >
          {isFullScreen ? <Minimize2Icon aria-hidden /> : <Maximize2Icon aria-hidden />}
        </MapControlButton>
        <MapControlButton label={t('explore.controls.showRomania')} onClick={onShowRomania}>
          <LocateFixedIcon aria-hidden />
        </MapControlButton>
      </div>
      <div className="absolute right-3.5 bottom-7 z-10 flex flex-col overflow-hidden rounded-thumb border border-border bg-card shadow-map-control">
        <button
          type="button"
          aria-label={t('explore.controls.zoomIn')}
          onClick={onZoomIn}
          className={ZOOM_BUTTON_CLASS}
        >
          <PlusIcon aria-hidden className="size-5.5" />
        </button>
        <button
          type="button"
          aria-label={t('explore.controls.zoomOut')}
          onClick={onZoomOut}
          className={cn(ZOOM_BUTTON_CLASS, 'border-t border-border')}
        >
          <MinusIcon aria-hidden className="size-5.5" />
        </button>
      </div>
    </>
  );
}

type MapControlButtonProps = {
  label: string;
  isPressed?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function MapControlButton({ label, isPressed, onClick, children }: MapControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isPressed}
      onClick={onClick}
      className="grid size-12 place-items-center rounded-thumb border border-border bg-card text-brand shadow-map-control transition-colors duration-(--duration-fast) hover:bg-surface-alt focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none [&_svg]:size-5"
    >
      {children}
    </button>
  );
}
