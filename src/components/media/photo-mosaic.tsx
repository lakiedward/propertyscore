import { ImageOffIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type MosaicPhoto = {
  id: string;
  src: string;
  smallSrc: string;
  alt: string;
};

type PhotoMosaicProps = {
  photos: readonly MosaicPhoto[];
  moreLabel?: string;
  emptyLabel: string;
  className?: string;
};

const SIDE_PHOTO_COUNT = 3;

export function PhotoMosaic({ photos, moreLabel, emptyLabel, className }: PhotoMosaicProps) {
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
    <div
      className={cn(
        'grid gap-1.5 p-1.5',
        side.length > 0 ? 'grid-cols-[minmax(0,3fr)_minmax(0,1fr)]' : 'grid-cols-1',
        className,
      )}
    >
      <img
        src={main.src}
        alt={main.alt}
        decoding="async"
        className="aspect-4/3 w-full rounded-md bg-surface-alt object-cover"
      />
      {side.length > 0 ? (
        <ul className="grid grid-rows-3 gap-1.5">
          {side.map((photo, index) => {
            const isLast = index === side.length - 1;
            return (
              <li
                key={photo.id}
                className="relative min-h-0 overflow-hidden rounded-md bg-surface-alt"
              >
                <img
                  src={photo.smallSrc}
                  alt={photo.alt}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
                {isLast && moreLabel ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-photo-overlay text-small font-extrabold text-on-inverse">
                    {moreLabel}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
