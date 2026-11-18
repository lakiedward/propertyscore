import { ImageOffIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { PhotoGallery, type GalleryPhoto } from './photo-gallery';

type PhotoMosaicProps = {
  photos: readonly GalleryPhoto[];
  moreLabel?: string;
  emptyLabel: string;
  className?: string;
};

const SIDE_PHOTO_COUNT = 2;

type GalleryState = { startIndex: number | null } | null;

export function PhotoMosaic({ photos, moreLabel, emptyLabel, className }: PhotoMosaicProps) {
  const { t } = useTranslation();
  const [gallery, setGallery] = useState<GalleryState>(null);
  const [main, ...rest] = photos;
  const side = rest.slice(0, SIDE_PHOTO_COUNT);

  if (!main) {
    return (
      <div className={cn('p-1.5', className)}>
        <div className="flex aspect-4/3 flex-col items-center justify-center gap-2 rounded-md bg-surface-sunken text-small text-muted-foreground">
          <ImageOffIcon aria-hidden className="size-6" />
          {emptyLabel}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'grid gap-1.5 p-1.5',
          side.length > 0
            ? 'aspect-2/1 grid-cols-[minmax(0,3fr)_minmax(0,1fr)] grid-rows-2'
            : 'aspect-16/9',
          className,
        )}
      >
        <MosaicTile
          label={t('photoGallery.open', { index: 1 })}
          className="row-span-2"
          onOpen={() => {
            setGallery({ startIndex: 0 });
          }}
        >
          <img
            src={main.src}
            alt={main.alt}
            decoding="async"
            className="size-full bg-surface-alt object-cover"
          />
        </MosaicTile>
        {side.map((photo, index) => {
          const hasMore = index === side.length - 1 && moreLabel !== undefined;
          return (
            <MosaicTile
              key={photo.id}
              label={
                hasMore
                  ? t('photoGallery.all', { count: photos.length })
                  : t('photoGallery.open', { index: index + 2 })
              }
              className={cn(side.length === 1 && 'row-span-2')}
              onOpen={() => {
                setGallery({ startIndex: hasMore ? null : index + 1 });
              }}
            >
              <img
                src={photo.smallSrc}
                alt={photo.alt}
                loading="lazy"
                decoding="async"
                className="size-full bg-surface-alt object-cover"
              />
              {hasMore ? (
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center bg-photo-overlay text-body font-extrabold text-on-inverse"
                >
                  {moreLabel}
                </span>
              ) : null}
            </MosaicTile>
          );
        })}
      </div>
      {gallery ? (
        <PhotoGallery
          photos={photos}
          startIndex={gallery.startIndex}
          onClose={() => {
            setGallery(null);
          }}
        />
      ) : null}
    </>
  );
}

type MosaicTileProps = {
  label: string;
  className?: string | undefined;
  onOpen: () => void;
  children: ReactNode;
};

function MosaicTile({ label, className, onOpen, children }: MosaicTileProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onOpen}
      className={cn(
        'relative block min-h-0 cursor-zoom-in overflow-hidden rounded-md focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
        className,
      )}
    >
      {children}
    </button>
  );
}
