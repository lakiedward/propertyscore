import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import type { ModerationCounts } from '../moderation.types';

const EMPTY_COUNTS: ModerationCounts = {
  pending_approval: 0,
  approved: 0,
  rejected: 0,
  blocked: 0,
};

export async function getModerationCounts(): Promise<ModerationCounts> {
  const { data, error } = await supabase.rpc('listing_moderation_counts');
  if (error) throw toAppError(error);
  const counts = { ...EMPTY_COUNTS };
  for (const row of data) {
    if (row.status !== 'draft') {
      counts[row.status] = row.total;
    }
  }
  return counts;
}
