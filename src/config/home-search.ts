import type { Enums } from '@/lib/supabase/database.types';

export const HOME_DELIVERABLES = ['report', 'zone', 'visual'] as const;

export type HomeDeliverable = (typeof HOME_DELIVERABLES)[number];

export const DEFAULT_DELIVERABLE: HomeDeliverable = 'report';

export const DEFAULT_TRANSACTION: Enums<'listing_transaction'> = 'sale';
