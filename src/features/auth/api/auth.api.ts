import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { z } from 'zod';
import { env } from '@/config/env';
import { supabase } from '@/lib/supabase/client';
import { Constants } from '@/lib/supabase/database.types';
import { toAppError } from '@/lib/supabase/errors';
import { safeRedirectPath } from '@/lib/url';
import type { AuthConfirmSearch, Credentials, SignUpPayload } from '../auth.schemas';
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

const REPEATED_SIGN_UP_AGE_MS = 120_000;

type CaptchaToken = { captchaToken?: string | undefined };

function emailLinkRedirectUrl(redirect: string | undefined): string {
  if (!redirect) {
    return env.siteUrl;
  }
  const url = new URL('/', env.siteUrl);
  url.searchParams.set('redirect', safeRedirectPath(redirect));
  return url.toString();
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

export async function signInWithPassword({
  email,
  password,
  captchaToken,
}: Credentials & CaptchaToken) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken },
  });
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

export type SignUpResult = {
  status: 'signed_in' | 'confirmation_sent' | 'confirmation_resent' | 'already_registered';
};

export async function signUp({
  email,
  password,
  fullName,
  locale,
  redirect,
  captchaToken,
}: SignUpPayload & CaptchaToken): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { locale, full_name: fullName },
      emailRedirectTo: emailLinkRedirectUrl(redirect),
      captchaToken,
    },
  });
  if (error) {
    const appError = toAppError(error);
    if (appError.reason === 'user_already_exists') {
      return { status: 'already_registered' };
    }
    throw appError;
  }
  if (data.session) {
    return { status: 'signed_in' };
  }
  if (!data.user?.identities?.length) {
    return { status: 'already_registered' };
  }
  const age = Date.now() - Date.parse(data.user.created_at);
  return { status: age > REPEATED_SIGN_UP_AGE_MS ? 'confirmation_resent' : 'confirmation_sent' };
}

type ResendConfirmationRequest = CaptchaToken & {
  email: string;
  redirect: string | undefined;
};

export async function resendConfirmation({
  email,
  redirect,
  captchaToken,
}: ResendConfirmationRequest) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: emailLinkRedirectUrl(redirect), captchaToken },
  });
  if (error) throw toAppError(error);
}

export type EmailLinkResult = { status: 'verified' | 'expired' | 'invalid' };

export async function verifyEmailLink({
  token_hash: tokenHash,
  type,
}: AuthConfirmSearch): Promise<EmailLinkResult> {
  if (!tokenHash || !type) {
    return { status: 'invalid' };
  }
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type === 'signup' ? 'email' : type,
  });
  if (!error) {
    return { status: 'verified' };
  }
  return { status: error.code === 'otp_expired' ? 'expired' : 'invalid' };
}

type PasswordResetRequest = CaptchaToken & { email: string };

export async function requestPasswordReset({ email, captchaToken }: PasswordResetRequest) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: emailLinkRedirectUrl('/password-reset/new'),
    captchaToken,
  });
  if (error) throw toAppError(error);
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw toAppError(error);
  const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' });
  if (signOutError) throw toAppError(signOutError);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw toAppError(error);
}
