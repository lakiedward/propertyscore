import type { Enums } from '@/lib/supabase/database.types';
import type { listListings } from './api/listings.api';

export type ListingTransaction = Enums<'listing_transaction'>;
export type ListingVerification = Enums<'listing_verification'>;

export type ListingFilters = {
  transaction: ListingTransaction;
  limit: number;
};

export type ListingPage = Awaited<ReturnType<typeof listListings>>;
export type Listing = ListingPage['items'][number];
