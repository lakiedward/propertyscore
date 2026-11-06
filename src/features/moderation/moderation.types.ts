import type { Enums } from '@/lib/supabase/database.types';

export type ListingStatus = Enums<'listing_status'>;

export type ModerationStatus = Exclude<ListingStatus, 'draft'>;

export type ModerationCounts = Record<ModerationStatus, number>;
