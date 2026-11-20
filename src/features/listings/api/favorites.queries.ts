import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import type { AuthState } from '@/features/auth';
import {
  addFavoriteListing,
  listFavoriteListingIds,
  listMyFavoriteListings,
  removeFavoriteListing,
  type FavoriteCursor,
} from './favorites.api';

const FAVORITE_IDS_STALE_MS = 300_000;

type FavoritePage = Awaited<ReturnType<typeof listMyFavoriteListings>>;

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
      initialPageParam: null as FavoriteCursor | null,
      getNextPageParam: (lastPage, pages) => {
        const loaded = pages.reduce((count, page) => count + page.items.length, 0);
        return lastPage.nextCursor && loaded < lastPage.total ? lastPage.nextCursor : undefined;
      },
    }),
  toggleKey: (userId: string) => [...favoriteQueries.all(), 'toggle', userId] as const,
};

export function warmFavoriteIds(queryClient: QueryClient, auth: AuthState) {
  if (!auth.user || auth.hasRole('admin')) {
    return;
  }
  void queryClient.query(favoriteQueries.ids(auth.user.id)).catch(() => undefined);
}

function withListing(ids: readonly string[], listingId: string, isFavorite: boolean) {
  const others = ids.filter((id) => id !== listingId);
  return isFavorite ? [...others, listingId] : others;
}

function withoutListing(data: InfiniteData<FavoritePage>, listingId: string) {
  const isListed = data.pages.some((page) =>
    page.items.some((item) => item.listing_id === listingId),
  );
  if (!isListed) {
    return data;
  }
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.listing_id !== listingId),
      total: Math.max(page.total - 1, 0),
    })),
  };
}

function removeFromList(queryClient: QueryClient, userId: string, listingId: string) {
  queryClient.setQueryData<InfiniteData<FavoritePage>>(
    favoriteQueries.list(userId).queryKey,
    (data) => (data ? withoutListing(data, listingId) : data),
  );
}

type ToggleFavoriteOptions = {
  onSuccess?: (isFavorite: boolean) => void;
};

export function useToggleFavorite(
  userId: string,
  listingId: string,
  { onSuccess }: ToggleFavoriteOptions = {},
) {
  const queryClient = useQueryClient();
  const idsKey = favoriteQueries.ids(userId).queryKey;
  const listKey = favoriteQueries.list(userId).queryKey;
  const toggleKey = favoriteQueries.toggleKey(userId);

  return useMutation({
    mutationKey: toggleKey,
    scope: { id: `favorite-listing-${listingId}` },
    mutationFn: (isFavorite: boolean) =>
      isFavorite ? addFavoriteListing(listingId) : removeFavoriteListing(listingId),
    onMutate: async (isFavorite) => {
      await queryClient.cancelQueries({ queryKey: idsKey });
      const hadIds = queryClient.getQueryData(idsKey) !== undefined;
      if (hadIds) {
        queryClient.setQueryData(idsKey, (ids = []) => withListing(ids, listingId, isFavorite));
      }
      if (!isFavorite) {
        await queryClient.cancelQueries({ queryKey: listKey });
        removeFromList(queryClient, userId, listingId);
      }
      return { hadIds };
    },
    onSuccess: (_data, isFavorite) => {
      onSuccess?.(isFavorite);
    },
    onError: (_error, isFavorite, context) => {
      if (context?.hadIds) {
        queryClient.setQueryData(idsKey, (ids = []) => withListing(ids, listingId, !isFavorite));
      } else {
        queryClient.removeQueries({ queryKey: idsKey, exact: true });
      }
      if (!isFavorite) {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: favoriteQueries.lists(),
        refetchType: 'none',
      });
      if (queryClient.isMutating({ mutationKey: toggleKey }) === 1) {
        await queryClient.invalidateQueries({ queryKey: idsKey });
      }
    },
  });
}
