import type { ExplorerSort } from '@/config/listings-explorer';
import type { Enums } from '@/lib/supabase/database.types';
import type { listListings } from './api/listings.api';
import type { getMyListing, listMyListings } from './api/my-listings.api';

export type ListingTransaction = Enums<'listing_transaction'>;
export type ListingVerification = Enums<'listing_verification'>;

export type ListingFilters = {
  transaction: ListingTransaction;
  limit: number;
};

export type ListingBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type ExplorerListingFilters = {
  transaction: ListingTransaction;
  bounds: ListingBounds | undefined;
  maxPrice: number | undefined;
  sort: ExplorerSort;
};

export type Listing = Awaited<ReturnType<typeof listListings>>['items'][number];

export type MyListing = Awaited<ReturnType<typeof getMyListing>>;

export type MyListingRow = Awaited<ReturnType<typeof listMyListings>>['items'][number];
