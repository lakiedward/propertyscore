import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LayoutGridIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePhotoZoom } from '@/hooks/use-photo-zoom';
import { formatPercent } from '@/i18n/format';
import { cn } from '@/lib/utils';

export type GalleryPhoto = {
  id: string;
  src: string;
  smallSrc: string;
  alt: string;
};

const ZOOM_BUTTON_CLASS =
  'aria-disabled:cursor-not-allowed aria-disabled:border-disabled-border aria-disabled:bg-disabled aria-disabled:text-disabled-foreground';

type PhotoGalleryProps = {
  photos: readonly GalleryPhoto[];
  startIndex: number | null;
  onClose: () => void;
};

export function PhotoGallery({ photos, startIndex, onClose }: PhotoGalleryProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState<number | null>(startIndex);
  const current = index === null ? undefined : photos[index];
  const { attachViewport, attachImage, ...zoom } = usePhotoZoom();

  const showPhoto = (nextIndex: number | null) => {
    zoom.reset();
    setIndex(nextIndex);
  };

  const step = (offset: number) => {
    zoom.reset();
    setIndex((value) =>
      value === null ? value : (value + offset + photos.length) % photos.length,
    );
  };

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        onKeyDown={(event) => {
          if (index === null) {
            return;
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            step(1);
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            step(-1);
          } else if (event.key === '+' || event.key === '=') {
            event.preventDefault();
            zoom.zoomIn();
          } else if (event.key === '-') {
            event.preventDefault();
            zoom.zoomOut();
          } else if (event.key === '0') {
            event.preventDefault();
            zoom.reset();
          }
        }}
        className="top-0 left-0 flex h-svh max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-surface-inverse/85 p-0 text-on-inverse ring-0 backdrop-blur-sm sm:max-w-none"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <DialogTitle className="text-body font-bold text-on-inverse tabular-nums">
            {current && index !== null
              ? t('photoGallery.counter', { index: index + 1, total: photos.length })
              : t('photoGallery.title', { count: photos.length })}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {current ? current.alt : t('photoGallery.description')}
          </DialogDescription>
          <div className="flex items-center gap-2">
            {current ? (
              <Button
                type="button"
                variant="outlineInverse"
                size="sm"
                onClick={() => {
                  showPhoto(null);
                }}
              >
                <LayoutGridIcon aria-hidden />
                {t('photoGallery.all', { count: photos.length })}
              </Button>
            ) : null}
            <DialogClose asChild>
              <Button type="button" variant="inverse" size="icon" shape="pill">
                <XIcon aria-hidden />
                <span className="sr-only">{t('photoGallery.close')}</span>
              </Button>
            </DialogClose>
          </div>
        </div>
        {current ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-2 pb-4">
            <div className="grid min-h-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[minmax(0,1fr)] items-center gap-3">
              <Button
                type="button"
                variant="inverse"
                size="icon"
                shape="pill"
                aria-label={t('photoGallery.previous')}
                disabled={photos.length < 2}
                onClick={() => {
                  step(-1);
                }}
              >
                <ChevronLeftIcon aria-hidden />
              </Button>
              <div
                ref={attachViewport}
                {...zoom.viewportHandlers}
                className={cn(
                  'flex size-full min-h-0 touch-none items-center justify-center overflow-hidden select-none',
                  zoom.isZoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in',
                )}
              >
                <img
                  ref={attachImage}
                  key={current.id}
                  src={current.src}
                  alt={current.alt}
                  decoding="async"
                  draggable={false}
                  style={{
                    transform: `translate3d(${String(zoom.offset.x)}px, ${String(zoom.offset.y)}px, 0) scale(${String(zoom.scale)})`,
                  }}
                  className={cn(
                    'max-h-full max-w-full rounded-md object-contain will-change-transform',
                    zoom.isAnimated && 'transition-transform duration-(--duration-fast)',
                  )}
                />
              </div>
              <Button
                type="button"
                variant="inverse"
                size="icon"
                shape="pill"
                aria-label={t('photoGallery.next')}
                disabled={photos.length < 2}
                onClick={() => {
                  step(1);
                }}
              >
                <ChevronRightIcon aria-hidden />
              </Button>
            </div>
            <div
              role="group"
              aria-label={t('photoGallery.zoom.label')}
              className="flex shrink-0 items-center justify-center gap-2"
            >
              <Button
                type="button"
                variant="inverse"
                size="icon-sm"
                shape="pill"
                aria-label={t('photoGallery.zoom.out')}
                aria-disabled={!zoom.canZoomOut}
                className={ZOOM_BUTTON_CLASS}
                onClick={zoom.zoomOut}
              >
                <ZoomOutIcon aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outlineInverse"
                size="sm"
                shape="pill"
                aria-label={t('photoGallery.zoom.reset', { value: formatPercent(zoom.scale) })}
                aria-disabled={!zoom.isZoomed}
                onClick={zoom.reset}
                className={cn(ZOOM_BUTTON_CLASS, 'min-w-18 tabular-nums')}
              >
                {formatPercent(zoom.scale)}
              </Button>
              <Button
                type="button"
                variant="inverse"
                size="icon-sm"
                shape="pill"
                aria-label={t('photoGallery.zoom.in')}
                aria-disabled={!zoom.canZoomIn}
                className={ZOOM_BUTTON_CLASS}
                onClick={zoom.zoomIn}
              >
                <ZoomInIcon aria-hidden />
              </Button>
            </div>
          </div>
        ) : (
          <ul className="grid min-h-0 flex-1 auto-rows-max grid-cols-2 gap-2 overflow-y-auto px-4 pb-6 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo, photoIndex) => (
              <li key={photo.id}>
                <button
                  type="button"
                  aria-label={t('photoGallery.open', { index: photoIndex + 1 })}
                  onClick={() => {
                    showPhoto(photoIndex);
                  }}
                  className="block w-full overflow-hidden rounded-md focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none"
                >
                  <img
                    src={photo.smallSrc}
                    alt={photo.alt}
                    loading="lazy"
                    decoding="async"
                    className="aspect-4/3 w-full bg-primary-deep object-cover transition-transform duration-(--duration-fast) hover:scale-[1.03]"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
