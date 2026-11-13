import type { DecisionReason, ListingDecision } from './moderation.types';

export type FormDecision = Exclude<ListingDecision, 'approved'>;

export const DECISION_REASONS = {
  rejected: ['photos', 'personal_data', 'price_area', 'description', 'contact_details'],
  blocked: ['duplicate', 'unavailable', 'personal_data', 'rules'],
} as const satisfies Record<FormDecision, readonly DecisionReason[]>;
