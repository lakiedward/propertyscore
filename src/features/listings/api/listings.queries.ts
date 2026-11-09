import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { ListingFilters, ListingsInBoundsFilters, ListingTransaction } from '../listing.types';
import {
  LISTINGS_IN_BOUNDS_PAGE_SIZE,
  listListings,
  listListingsInBounds,
  listMapPoints,
} from './listings.api';

const MAP_POINTS_STALE_MS = 60_000;

export const LISTINGS_PREVIEW_LIMIT = 6;

export const listingQueries = {
  all: () => ['listings'] as const,
  lists: () => [...listingQueries.all(), 'list'] as const,
  list: (filters: ListingFilters) =>
    queryOptions({
      queryKey: [...listingQueries.lists(), filters],
      queryFn: () => listListings(filters),
    }),
  mapPoints: (transaction: ListingTransaction) =>
    queryOptions({
      queryKey: [...listingQueries.all(), 'map-points', transaction],
      queryFn: () => listMapPoints(transaction),
      staleTime: MAP_POINTS_STALE_MS,
    }),
  inBounds: (filters: ListingsInBoundsFilters) =>
    infiniteQueryOptions({
      queryKey: [...listingQueries.lists(), 'in-bounds', filters],
      queryFn: ({ pageParam }) => listListingsInBounds({ ...filters, page: pageParam }),
      initialPageParam: 0,
      getNextPageParam: (lastPage, pages) =>
        pages.length * LISTINGS_IN_BOUNDS_PAGE_SIZE < lastPage.total ? pages.length : undefined,
    }),
};
