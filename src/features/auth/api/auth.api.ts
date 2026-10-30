import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { Locale } from '@/i18n/i18n';
import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import type { Credentials } from '../auth.schemas';

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw toAppError(error);
  return data.session;
}

export function subscribeToAuthChanges(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return () => {
    data.subscription.unsubscribe();
  };
}

export async function signInWithPassword({ email, password }: Credentials) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw toAppError(error);
  return data.session;
}

export async function signUp({
  email,
  password,
  fullName,
  locale,
}: Credentials & { fullName: string; locale: Locale }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { locale, full_name: fullName },
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw toAppError(error);
  return { session: data.session, needsEmailConfirmation: data.session === null };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw toAppError(error);
}
