import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { z } from 'zod';
import { env } from '@/config/env';
import { supabase } from '@/lib/supabase/client';
import { Constants } from '@/lib/supabase/database.types';
import { toAppError } from '@/lib/supabase/errors';
import { safeRedirectPath } from '@/lib/url';
import type { Credentials, SignUpPayload } from '../auth.schemas';
import { SOCIAL_PROVIDERS, type AppRole, type SocialProvider } from '../auth.types';

const APP_ROLES: readonly string[] = Constants.public.Enums.app_role;

const rolesClaimSchema = z.object({
  user_roles: z.array(z.string()).catch([]),
});

const authSettingsSchema = z.object({
  external: z.record(z.string(), z.boolean()),
});

function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value);
}

function authCallbackUrl(redirect: string | undefined): string {
  const url = new URL('/auth/callback', env.siteUrl);
  if (redirect) {
    url.searchParams.set('redirect', safeRedirectPath(redirect));
  }
  return url.toString();
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw toAppError(error);
  return data.session;
}

export async function getRoles(accessToken: string): Promise<AppRole[]> {
  const { data, error } = await supabase.auth.getClaims(accessToken);
  if (error) throw toAppError(error);
  return rolesClaimSchema.parse(data?.claims ?? {}).user_roles.filter(isAppRole);
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

export async function listEnabledSocialProviders(): Promise<SocialProvider[]> {
  try {
    const response = await fetch(new URL('/auth/v1/settings', env.VITE_SUPABASE_URL), {
      headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY },
    });
    if (!response.ok) {
      throw new Error(`Auth settings request failed with status ${String(response.status)}`);
    }
    const { external } = authSettingsSchema.parse(await response.json());
    return SOCIAL_PROVIDERS.filter((provider) => external[provider] === true);
  } catch (error) {
    throw toAppError(error);
  }
}

type SocialSignInRequest = {
  provider: SocialProvider;
  redirect: string | undefined;
};

export async function signInWithProvider({ provider, redirect }: SocialSignInRequest) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: authCallbackUrl(redirect) },
  });
  if (error) throw toAppError(error);
}

export async function signUp({ email, password, fullName, locale, redirect }: SignUpPayload) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { locale, full_name: fullName },
      emailRedirectTo: authCallbackUrl(redirect),
    },
  });
  if (error) throw toAppError(error);
  return { session: data.session, needsEmailConfirmation: data.session === null };
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authCallbackUrl('/password-reset/new'),
  });
  if (error) throw toAppError(error);
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw toAppError(error);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw toAppError(error);
}
