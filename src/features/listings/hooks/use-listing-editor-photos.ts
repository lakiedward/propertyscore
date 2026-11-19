import { getListingMediumUrl } from '../api/listings.storage';
import {
  useAddListingPhotos,
  useRemoveListingPhoto,
  useReorderListingPhotos,
} from '../api/my-listings.queries';
import type { ListingPhotoItem } from '../components/listing-photos-field';
import { LISTING_MIN_PHOTOS } from '../listing-form.schemas';
import type { MyListing } from '../listing.types';
import { usePendingListingPhotos } from './use-pending-listing-photos';

export function useListingEditorPhotos(listing: MyListing | null, ownerId: string) {
  const addPhotos = useAddListingPhotos();
  const removePhoto = useRemoveListingPhoto();
  const reorderPhotos = useReorderListingPhotos();
  const pendingPhotos = usePendingListingPhotos();
  const photoItems: ListingPhotoItem[] = listing
    ? listing.photos.map((photo) => ({ id: photo.id, src: getListingMediumUrl(photo.path) }))
    : [...pendingPhotos.photos];

  return {
    photoItems,
    missingPhotos: Math.max(0, LISTING_MIN_PHOTOS - photoItems.length),
    isAdding: addPhotos.isPending,
    isRemoving: removePhoto.isPending,
    error: listing ? (addPhotos.error ?? removePhoto.error ?? reorderPhotos.error) : null,
    add: (files: File[]) => {
      if (listing) {
        addPhotos.mutate({
          ownerId,
          listingId: listing.id,
          files,
          nextPosition: photoItems.length,
        });
      } else {
        pendingPhotos.add(files);
      }
    },
    reorder: (photoIds: string[]) => {
      if (listing) {
        reorderPhotos.mutate({ ownerId, listingId: listing.id, photoIds });
      } else {
        pendingPhotos.reorder(photoIds);
      }
    },
    remove: (id: string) => {
      const saved = listing?.photos.find((photo) => photo.id === id);
      if (saved && listing) {
        removePhoto.mutate({ id: saved.id, path: saved.path, listingId: listing.id });
      } else {
        pendingPhotos.remove(id);
      }
    },
    uploadPending: (listingId: string) =>
      addPhotos.mutateAsync({
        ownerId,
        listingId,
        files: pendingPhotos.photos.map((photo) => photo.file),
        nextPosition: 0,
      }),
  };
}
