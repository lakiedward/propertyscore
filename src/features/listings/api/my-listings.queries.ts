import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { toListingPhoto, toListingThumb } from '../listing.images';
import {
  addListingPhotoRow,
  createListing,
  getMyListing,
  listCities,
  listMyListings,
  removeListingPhotoRow,
  submitListing,
  updateListing,
} from './my-listings.api';
import {
  downloadListingFile,
  listingPhotoPath,
  removeListingFile,
  uploadListingFile,
  uploadListingThumb,
} from './listings.storage';

const CITIES_STALE_MS = 3_600_000;

export const myListingQueries = {
  all: () => ['my-listings'] as const,
  lists: () => [...myListingQueries.all(), 'list'] as const,
  list: (ownerId: string) =>
    queryOptions({
      queryKey: [...myListingQueries.lists(), ownerId],
      queryFn: () => listMyListings(ownerId),
    }),
  detail: (id: string, ownerId: string) =>
    queryOptions({
      queryKey: [...myListingQueries.all(), 'detail', id, ownerId],
      queryFn: () => getMyListing(id, ownerId),
    }),
  cities: () =>
    queryOptions({
      queryKey: ['cities'],
      queryFn: listCities,
      staleTime: CITIES_STALE_MS,
    }),
};

export function useCreateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createListing,
    meta: { silent: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myListingQueries.lists() }),
  });
}

export function useUpdateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateListing,
    meta: { silent: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myListingQueries.all() }),
  });
}

export function useSubmitListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitListing,
    meta: { silent: true },
    onSettled: () => queryClient.invalidateQueries({ queryKey: myListingQueries.all() }),
  });
}

type AddPhotosInput = {
  ownerId: string;
  listingId: string;
  files: readonly File[];
  nextPosition: number;
};

export function useAddListingPhotos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ownerId, listingId, files, nextPosition }: AddPhotosInput) => {
      let position = nextPosition;
      for (const file of files) {
        const photo = await toListingPhoto(file);
        const path = listingPhotoPath(ownerId, listingId, crypto.randomUUID());
        await uploadListingFile(path, photo);
        await addListingPhotoRow({ listingId, path, position });
        if (position === 0) {
          await uploadListingThumb(path, await toListingThumb(photo));
        }
        position += 1;
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: myListingQueries.all() }),
  });
}

type RemovePhotoInput = {
  photo: { id: string; path: string };
  nextCoverPath: string | null;
};

export function useRemoveListingPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ photo, nextCoverPath }: RemovePhotoInput) => {
      await removeListingPhotoRow(photo.id);
      await removeListingFile(photo.path);
      if (nextCoverPath) {
        const cover = await downloadListingFile(nextCoverPath);
        await uploadListingThumb(nextCoverPath, await toListingThumb(cover));
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: myListingQueries.all() }),
  });
}
