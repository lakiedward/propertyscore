import { cva } from 'class-variance-authority';
import { InboxIcon } from 'lucide-react';
import { LISTING_STATUS_META, type ListingStatus } from '@/features/listings';
import type { ModerationStatus } from './moderation.types';

export const MODERATION_STATUSES = [
  'pending_approval',
  'approved',
  'rejected',
  'blocked',
] as const satisfies readonly ModerationStatus[];

export const QUEUE_HIDDEN_STORAGE_KEY = 'ps-moderation-queue-hidden';

export const STATUS_META = {
  pending_approval: { ...LISTING_STATUS_META.pending_approval, icon: InboxIcon },
  approved: LISTING_STATUS_META.approved,
  rejected: LISTING_STATUS_META.rejected,
  blocked: LISTING_STATUS_META.blocked,
} as const;

export const statusDotVariants = cva('size-2 shrink-0 rounded-full', {
  variants: {
    status: {
      pending_approval: 'bg-info',
      approved: 'bg-success',
      rejected: 'bg-warning-fill',
      blocked: 'bg-destructive',
    },
  },
});

export function toModerationStatus(status: ListingStatus): ModerationStatus {
  if (status === 'draft') {
    return 'pending_approval';
  }
  return status === 'suspended' ? 'approved' : status;
}
