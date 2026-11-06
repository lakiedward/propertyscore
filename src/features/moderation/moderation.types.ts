import type { Enums } from '@/lib/supabase/database.types';
import type { getModerationListing, listModerationQueue } from './api/moderation.api';

export type ListingStatus = Enums<'listing_status'>;

export type ModerationStatus = Exclude<ListingStatus, 'draft'>;

export type ModerationCounts = Record<ModerationStatus, number>;

export type ListingDecision = Enums<'listing_decision'>;

export type DecisionReason = Enums<'listing_decision_reason'>;

export type DecisionInput = {
  listingId: string;
  decision: ListingDecision;
  reasons: DecisionReason[];
  message: string | null;
};

export type QueueListing = Awaited<ReturnType<typeof listModerationQueue>>['items'][number];

export type ReviewListing = Awaited<ReturnType<typeof getModerationListing>>;
