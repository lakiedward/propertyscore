import {
  BanIcon,
  CircleCheckIcon,
  HourglassIcon,
  PencilIcon,
  Undo2Icon,
  type LucideIcon,
} from 'lucide-react';
import type { Enums } from '@/lib/supabase/database.types';

export type ListingStatus = Enums<'listing_status'>;

export const LISTING_STATUS_META = {
  draft: { tone: 'neutral', icon: PencilIcon },
  pending_approval: { tone: 'info', icon: HourglassIcon },
  approved: { tone: 'success', icon: CircleCheckIcon },
  rejected: { tone: 'warning', icon: Undo2Icon },
  blocked: { tone: 'error', icon: BanIcon },
} as const satisfies Record<
  ListingStatus,
  { tone: 'neutral' | 'info' | 'success' | 'warning' | 'error'; icon: LucideIcon }
>;

export function isEditableStatus(status: ListingStatus): boolean {
  return status === 'draft' || status === 'rejected';
}
