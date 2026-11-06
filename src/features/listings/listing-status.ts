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

export const OWNER_STATUS_META = {
  draft: { tone: 'neutral', icon: PencilIcon, notice: 'neutral' },
  pending_approval: { tone: 'info', icon: HourglassIcon, notice: 'info' },
  approved: { tone: 'success', icon: CircleCheckIcon, notice: 'success' },
  rejected: { tone: 'warning', icon: Undo2Icon, notice: 'warning' },
  blocked: { tone: 'error', icon: BanIcon, notice: 'error' },
} as const satisfies Record<
  ListingStatus,
  {
    tone: 'neutral' | 'info' | 'success' | 'warning' | 'error';
    icon: LucideIcon;
    notice: 'neutral' | 'info' | 'success' | 'warning' | 'error';
  }
>;

export function isEditableStatus(status: ListingStatus): boolean {
  return status === 'draft' || status === 'rejected';
}
