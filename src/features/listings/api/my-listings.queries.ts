import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { toListingPhotoFiles } from '../listing.images';
import {
  addListingPhotoRow,
  createListing,
  discardListingRevision,
  getMyListing,
  listCities,
  listMyListings,
  removeListingPhotoRow,
  reorderListingPhotos,
  startListingRevision,
  submitListing,
  updateListing,
} from './my-listings.api';
import {
  isInListingFolder,
  listingPhotoPath,
  removeListingPhotoFiles,
  uploadListingPhotoFiles,
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
        const photoFiles = await toListingPhotoFiles(file);
        const path = listingPhotoPath(ownerId, listingId, crypto.randomUUID());
        await uploadListingPhotoFiles(path, photoFiles);
        try {
          await addListingPhotoRow({ listingId, path, position });
        } catch (error) {
          await removeListingPhotoFiles(path).catch((cleanupError: unknown) => {
            logger.warn('Could not remove the files of an unsaved listing photo', {
              error: cleanupError,
            });
          });
          throw error;
        }
        position += 1;
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: myListingQueries.all() }),
  });
}

type ReorderPhotosInput = { ownerId: string; listingId: string; photoIds: string[] };

export function useReorderListingPhotos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, photoIds }: ReorderPhotosInput) =>
      reorderListingPhotos({ listingId, photoIds }),
    meta: { silent: true },
    onMutate: async ({ ownerId, listingId, photoIds }) => {
      const { queryKey } = myListingQueries.detail(listingId, ownerId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (listing) => {
        if (!listing) {
          return listing;
        }
        const photos = photoIds.flatMap((id, position) => {
          const photo = listing.photos.find((candidate) => candidate.id === id);
          return photo ? [{ ...photo, position }] : [];
        });
        return { ...listing, photos };
      });
      return { queryKey, previous };
    },
    onError: (_error, _input, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: myListingQueries.all() }),
  });
}

type RemovePhotoInput = { id: string; path: string; listingId: string };

export function useRemoveListingPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, path, listingId }: RemovePhotoInput) => {
      await removeListingPhotoRow(id);
      if (!isInListingFolder(path, listingId)) {
        return;
      }
      await removeListingPhotoFiles(path).catch((error: unknown) => {
        logger.warn('Could not remove the files of a deleted listing photo', { error });
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: myListingQueries.all() }),
  });
}

export function useStartListingRevision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startListingRevision,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myListingQueries.lists() }),
  });
}

type DiscardRevisionInput = { revisionId: string; photoPaths: readonly string[] };

export function useDiscardListingRevision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ revisionId, photoPaths }: DiscardRevisionInput) => {
      const ownFiles = photoPaths.filter((path) => isInListingFolder(path, revisionId));
      for (const path of ownFiles) {
        await removeListingPhotoFiles(path).catch((error: unknown) => {
          logger.warn('Could not remove the files of a discarded revision photo', { error });
        });
      }
      await discardListingRevision(revisionId);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: myListingQueries.all() }),
  });
}
