import { cva } from 'class-variance-authority';
import { BanIcon, CircleCheckIcon, InboxIcon, Undo2Icon, type LucideIcon } from 'lucide-react';
import type { ListingStatus, ModerationStatus } from './moderation.types';

export const MODERATION_STATUSES = [
  'pending_approval',
  'approved',
  'rejected',
  'blocked',
] as const satisfies readonly ModerationStatus[];

export const STATUS_META = {
  pending_approval: { tone: 'info', icon: InboxIcon },
  approved: { tone: 'success', icon: CircleCheckIcon },
  rejected: { tone: 'warning', icon: Undo2Icon },
  blocked: { tone: 'error', icon: BanIcon },
} as const satisfies Record<
  ModerationStatus,
  { tone: 'info' | 'success' | 'warning' | 'error'; icon: LucideIcon }
>;

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
  return status === 'draft' ? 'pending_approval' : status;
}
