import { queryOptions } from '@tanstack/react-query';
import type { ListingFilters } from '../listing.types';
import { listListings } from './listings.api';

export const listingQueries = {
  all: () => ['listings'] as const,
  lists: () => [...listingQueries.all(), 'list'] as const,
  list: (filters: ListingFilters) =>
    queryOptions({
      queryKey: [...listingQueries.lists(), filters],
      queryFn: () => listListings(filters),
    }),
};
