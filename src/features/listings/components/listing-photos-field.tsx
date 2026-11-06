import { ImagePlusIcon, Trash2Icon } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useErrorMessage } from '@/i18n/error-message';
import { getListingMediumUrl } from '../api/listings.storage';
import { useAddListingPhotos, useRemoveListingPhoto } from '../api/my-listings.queries';
import { LISTING_PHOTO_TYPES } from '../listing.images';

const MAX_PHOTOS = 20;

type ListingPhoto = { id: string; path: string };

type ListingPhotosFieldProps = {
  ownerId: string;
  listingId: string | null;
  photos: readonly ListingPhoto[];
  isEditable: boolean;
};

function isAcceptedType(file: File): boolean {
  return LISTING_PHOTO_TYPES.some((type) => type === file.type);
}

export function ListingPhotosField({
  ownerId,
  listingId,
  photos,
  isEditable,
}: ListingPhotosFieldProps) {
  const { t } = useTranslation('myListings');
  const errorMessage = useErrorMessage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [typeError, setTypeError] = useState(false);
  const addPhotos = useAddListingPhotos();
  const removePhoto = useRemoveListingPhoto();
  const canAdd = isEditable && listingId !== null && photos.length < MAX_PHOTOS;
  const error = addPhotos.error ?? removePhoto.error;

  const handleFiles = (files: FileList | null) => {
    if (!files || !listingId) {
      return;
    }
    const selected = [...files];
    const accepted = selected.filter(isAcceptedType).slice(0, MAX_PHOTOS - photos.length);
    setTypeError(selected.some((file) => !isAcceptedType(file)));
    if (accepted.length > 0) {
      addPhotos.mutate({ ownerId, listingId, files: accepted, nextPosition: photos.length });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-small text-muted-foreground">{t('photos.description')}</p>
        <span className="text-meta text-muted-foreground tabular-nums">
          {t('photos.count', { count: photos.length, max: MAX_PHOTOS })}
        </span>
      </div>
      {listingId === null ? (
        <p className="rounded-md bg-surface-sunken px-4 py-3 text-small text-muted-foreground">
          {t('photos.saveFirst')}
        </p>
      ) : null}
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, index) => (
            <li key={photo.id} className="relative overflow-hidden rounded-md bg-surface-alt">
              <img
                src={getListingMediumUrl(photo.path)}
                alt={t('photos.alt', { index: index + 1 })}
                loading="lazy"
                decoding="async"
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
                  disabled={removePhoto.isPending || addPhotos.isPending}
                  onClick={() => {
                    removePhoto.mutate(photo);
                  }}
                >
                  <Trash2Icon aria-hidden />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
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
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={LISTING_PHOTO_TYPES.join(',')}
            multiple
            hidden
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={addPhotos.isPending}
            aria-busy={addPhotos.isPending}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlusIcon aria-hidden />
            {addPhotos.isPending ? t('photos.adding') : t('photos.add')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
