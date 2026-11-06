import type { Enums } from '@/lib/supabase/database.types';
import type { listListings } from './api/listings.api';
import type { getMyListing, listMyListings } from './api/my-listings.api';

export type ListingTransaction = Enums<'listing_transaction'>;
export type ListingVerification = Enums<'listing_verification'>;

export type ListingFilters = {
  transaction: ListingTransaction;
  limit: number;
};

export type Listing = Awaited<ReturnType<typeof listListings>>['items'][number];

export type MyListing = Awaited<ReturnType<typeof getMyListing>>;

export type MyListingRow = Awaited<ReturnType<typeof listMyListings>>['items'][number];
