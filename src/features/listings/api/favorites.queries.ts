import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  addFavoriteListing,
  listFavoriteListingIds,
  listMyFavoriteListings,
  removeFavoriteListing,
} from './favorites.api';

const FAVORITE_IDS_STALE_MS = 300_000;

export const favoriteQueries = {
  all: () => ['favorite-listings'] as const,
  ids: (userId: string) =>
    queryOptions({
      queryKey: [...favoriteQueries.all(), 'ids', userId],
      queryFn: listFavoriteListingIds,
      staleTime: FAVORITE_IDS_STALE_MS,
    }),
  lists: () => [...favoriteQueries.all(), 'list'] as const,
  list: (userId: string) =>
    infiniteQueryOptions({
      queryKey: [...favoriteQueries.lists(), userId],
      queryFn: ({ pageParam }) => listMyFavoriteListings(pageParam),
      initialPageParam: 0,
      getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length : undefined),
    }),
};

type ToggleFavoriteInput = {
  listingId: string;
  isFavorite: boolean;
};

export function useToggleFavorite(userId: string) {
  const queryClient = useQueryClient();
  const idsKey = favoriteQueries.ids(userId).queryKey;
  return useMutation({
    mutationFn: ({ listingId, isFavorite }: ToggleFavoriteInput) =>
      isFavorite ? addFavoriteListing(listingId) : removeFavoriteListing(listingId),
    onMutate: async ({ listingId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: idsKey });
      const previous = queryClient.getQueryData(idsKey);
      queryClient.setQueryData(idsKey, (ids = []) =>
        isFavorite
          ? [...ids.filter((id) => id !== listingId), listingId]
          : ids.filter((id) => id !== listingId),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(idsKey, context?.previous);
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: idsKey }),
        queryClient.invalidateQueries({ queryKey: favoriteQueries.lists() }),
      ]),
  });
}
