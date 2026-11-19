import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { ExplorerListingFilters, ListingFilters, ListingTransaction } from '../listing.types';
import {
  EXPLORER_PAGE_SIZE,
  getListingMapCard,
  getListingMapSummary,
  getPublicListing,
  listExplorerListings,
  listListings,
} from './listings.api';
import { getRomaniaRegions } from './romania-regions.api';

const MAP_STALE_MS = 60_000;

export const LISTINGS_PREVIEW_LIMIT = 6;

export const listingQueries = {
  all: () => ['listings'] as const,
  lists: () => [...listingQueries.all(), 'list'] as const,
  list: (filters: ListingFilters) =>
    queryOptions({
      queryKey: [...listingQueries.lists(), filters],
      queryFn: () => listListings(filters),
    }),
  mapSummary: (filters: { transaction: ListingTransaction; maxPrice: number | undefined }) =>
    queryOptions({
      queryKey: [...listingQueries.all(), 'map-summary', filters],
      queryFn: () => getListingMapSummary(filters),
      staleTime: MAP_STALE_MS,
    }),
  mapCard: (id: string) =>
    queryOptions({
      queryKey: [...listingQueries.all(), 'map-card', id],
      queryFn: () => getListingMapCard(id),
      staleTime: MAP_STALE_MS,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: [...listingQueries.all(), 'detail', id],
      queryFn: () => getPublicListing(id),
    }),
  explorer: (filters: ExplorerListingFilters) =>
    infiniteQueryOptions({
      queryKey: [...listingQueries.lists(), 'explorer', filters],
      queryFn: ({ pageParam }) => listExplorerListings({ ...filters, page: pageParam }),
      initialPageParam: 0,
      getNextPageParam: (lastPage, pages) =>
        pages.length * EXPLORER_PAGE_SIZE < lastPage.total ? pages.length : undefined,
    }),
  romaniaRegions: () =>
    queryOptions({
      queryKey: ['geo', 'romania-regions'] as const,
      queryFn: getRomaniaRegions,
      staleTime: Infinity,
      gcTime: Infinity,
    }),
};
