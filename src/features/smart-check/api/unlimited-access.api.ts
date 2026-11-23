import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';

export async function listUnlimitedAccounts() {
  const { data, error } = await supabase.rpc('list_smartcheck_unlimited_accounts');
  if (error) throw toAppError(error);
  return data;
}

export async function setSmartCheckUnlimited(input: { email: string; isUnlimited: boolean }) {
  const { error } = await supabase.rpc('set_smartcheck_unlimited', {
    p_email: input.email,
    p_is_unlimited: input.isUnlimited,
  });
  if (error) throw toAppError(error);
}
