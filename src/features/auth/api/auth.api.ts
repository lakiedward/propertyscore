import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import { safeRedirectPath } from '@/lib/url';
import type { Credentials, SignUpPayload } from '../auth.schemas';

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

function confirmationRedirectUrl(redirect: string | undefined): string {
  const url = new URL('/login', env.siteUrl);
  if (redirect) {
    url.searchParams.set('redirect', safeRedirectPath(redirect));
  }
  return url.toString();
}

export async function signUp({ email, password, fullName, locale, redirect }: SignUpPayload) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { locale, full_name: fullName },
      emailRedirectTo: confirmationRedirectUrl(redirect),
    },
  });
  if (error) throw toAppError(error);
  return { session: data.session, needsEmailConfirmation: data.session === null };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw toAppError(error);
}
