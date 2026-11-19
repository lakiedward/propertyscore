import { z } from 'zod';
import { messageKey } from '@/i18n/validation';
import { Constants } from '@/lib/supabase/database.types';
import { MODERATION_STATUSES } from './moderation-status';

export const DECISION_MESSAGE_MAX = 2000;

export const moderationSearchSchema = z.object({
  status: z.enum(MODERATION_STATUSES).default('pending_approval').catch('pending_approval'),
  listing: z.uuid().optional().catch(undefined),
});

export const decisionFormSchema = z.object({
  reasons: z
    .array(z.enum(Constants.public.Enums.listing_decision_reason))
    .min(1, messageKey('common:errors.reasons.decision_reason_invalid')),
  message: z
    .string()
    .trim()
    .min(1, messageKey('common:errors.reasons.decision_message_required'))
    .max(DECISION_MESSAGE_MAX),
});

export type DecisionFormValues = z.infer<typeof decisionFormSchema>;
