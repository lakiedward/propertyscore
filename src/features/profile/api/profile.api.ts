import type { Locale } from '@/i18n/i18n';
import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';

const PROFILE_COLUMNS = 'id, locale' as const;

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .single();
  if (error) throw toAppError(error);
  return data;
}

export async function updateProfileLocale({ userId, locale }: { userId: string; locale: Locale }) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ locale })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return data;
}
