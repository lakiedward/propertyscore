import { z } from 'zod';
import { messageKey } from '@/i18n/validation';
import { MODERATION_STATUSES } from './moderation-status';

const DECISION_REASON_CODES = [
  'photos',
  'personal_data',
  'price_area',
  'description',
  'contact_details',
  'duplicate',
  'unavailable',
  'rules',
] as const;

export const moderationSearchSchema = z.object({
  status: z.enum(MODERATION_STATUSES).default('pending_approval').catch('pending_approval'),
  listing: z.uuid().optional().catch(undefined),
});

export const decisionFormSchema = z.object({
  reasons: z
    .array(z.enum(DECISION_REASON_CODES))
    .min(1, messageKey('common:errors.reasons.decision_reason_invalid')),
  message: z
    .string()
    .trim()
    .min(1, messageKey('common:errors.reasons.decision_message_required'))
    .max(2000),
});

export type DecisionFormValues = z.infer<typeof decisionFormSchema>;
