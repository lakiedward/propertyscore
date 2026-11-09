import { ArrowLeftIcon, ArrowRightIcon, Trash2Icon } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { MediaUpload } from '@/components/media/media-upload';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useErrorMessage } from '@/i18n/error-message';
import { LISTING_MAX_PHOTOS } from '../listing-form.schemas';
import { LISTING_PHOTO_TYPES } from '../listing.images';
import { moveId } from '../listing.utils';

export type ListingPhotoItem = { id: string; src: string };

type ListingPhotosFieldProps = {
  photos: readonly ListingPhotoItem[];
  isEditable: boolean;
  isAdding: boolean;
  isBusy: boolean;
  error: unknown;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onReorder: (ids: string[]) => void;
};

function isLeavingItem(event: DragEvent<HTMLLIElement>): boolean {
  const next = event.relatedTarget;
  return !(next instanceof Node && event.currentTarget.contains(next));
}

function isAcceptedType(file: File): boolean {
  return LISTING_PHOTO_TYPES.some((type) => type === file.type);
}

export function ListingPhotosField({
  photos,
  isEditable,
  isAdding,
  isBusy,
  error,
  onAdd,
  onRemove,
  onReorder,
}: ListingPhotosFieldProps) {
  const { t } = useTranslation('myListings');
  const errorMessage = useErrorMessage();
  const [typeError, setTypeError] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const canAdd = isEditable && photos.length < LISTING_MAX_PHOTOS;
  const canReorder = isEditable && photos.length > 1;
  const ids = photos.map((photo) => photo.id);

  const move = (id: string, targetIndex: number) => {
    const next = moveId(ids, id, targetIndex);
    if (next.join() === ids.join()) {
      return;
    }
    onReorder(next);
    setAnnouncement(t('photos.moved', { position: next.indexOf(id) + 1, total: next.length }));
  };

  const endDrag = () => {
    setDraggedId(null);
    setOverId(null);
  };

  const handleFiles = (selected: File[]) => {
    const accepted = selected.filter(isAcceptedType).slice(0, LISTING_MAX_PHOTOS - photos.length);
    setTypeError(selected.some((file) => !isAcceptedType(file)));
    if (accepted.length > 0) {
      onAdd(accepted);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-small text-muted-foreground">{t('photos.description')}</p>
          {canReorder ? (
            <p className="text-small text-muted-foreground">{t('photos.reorderHint')}</p>
          ) : null}
        </div>
        <span className="text-meta text-muted-foreground tabular-nums">
          {t('photos.count', { count: photos.length, max: LISTING_MAX_PHOTOS })}
        </span>
      </div>
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              draggable={canReorder && !isBusy}
              data-dragging={draggedId === photo.id ? true : undefined}
              data-over={overId === photo.id && draggedId !== photo.id ? true : undefined}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', photo.id);
                setDraggedId(photo.id);
              }}
              onDragOver={(event) => {
                if (draggedId === null) {
                  return;
                }
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setOverId(photo.id);
              }}
              onDragLeave={(event) => {
                if (isLeavingItem(event)) {
                  setOverId((current) => (current === photo.id ? null : current));
                }
              }}
              onDrop={(event) => {
                if (draggedId === null) {
                  return;
                }
                event.preventDefault();
                move(draggedId, index);
                endDrag();
              }}
              onDragEnd={endDrag}
              className="relative overflow-hidden rounded-md bg-surface-alt transition-opacity duration-(--duration-fast) data-dragging:cursor-grabbing data-dragging:opacity-40 data-over:ring-3 data-over:ring-primary data-over:ring-offset-2 [&[draggable=true]]:cursor-grab"
            >
              <img
                src={photo.src}
                alt={t('photos.alt', { index: index + 1 })}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="aspect-4/3 w-full object-cover"
              />
              {index === 0 ? (
                <span className="absolute bottom-2 left-2 rounded-sm bg-card px-2 py-0.5 text-meta font-bold text-foreground">
                  {t('photos.cover')}
                </span>
              ) : null}
              {isEditable ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="inverse"
                  className="absolute top-2 right-2 shadow-sm"
                  aria-label={t('photos.remove', { index: index + 1 })}
                  disabled={isBusy}
                  onClick={() => {
                    onRemove(photo.id);
                  }}
                >
                  <Trash2Icon aria-hidden />
                </Button>
              ) : null}
              {canReorder ? (
                <div className="absolute right-2 bottom-2 flex gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="inverse"
                    className="shadow-sm"
                    aria-label={t('photos.moveEarlier', { index: index + 1 })}
                    disabled={isBusy || index === 0}
                    onClick={() => {
                      move(photo.id, index - 1);
                    }}
                  >
                    <ArrowLeftIcon aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="inverse"
                    className="shadow-sm"
                    aria-label={t('photos.moveLater', { index: index + 1 })}
                    disabled={isBusy || index === photos.length - 1}
                    onClick={() => {
                      move(photo.id, index + 1);
                    }}
                  >
                    <ArrowRightIcon aria-hidden />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {typeError ? (
        <Alert tone="warning">
          <AlertDescription>{t('photos.invalidType')}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="error">
          <AlertDescription>{errorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}
      {canAdd ? (
        <MediaUpload
          label={isAdding ? t('photos.adding') : t('photos.add')}
          hint={t('photos.dropHint', { max: LISTING_MAX_PHOTOS })}
          accept={LISTING_PHOTO_TYPES.join(',')}
          isBusy={isAdding}
          isDisabled={isBusy}
          isInvalid={typeError}
          onAdd={handleFiles}
        />
      ) : null}
    </div>
  );
}
