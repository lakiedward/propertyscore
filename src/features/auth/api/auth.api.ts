import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { z } from 'zod';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import { safeRedirectPath } from '@/lib/url';
import type { AuthConfirmSearch, Credentials, SignUpPayload } from '../auth.schemas';
import { SOCIAL_PROVIDERS, type SocialProvider } from '../auth.types';

const authSettingsSchema = z.object({
  external: z.record(z.string(), z.boolean()),
});

const REPEATED_SIGN_UP_AGE_MS = 120_000;
const SERVER_ERROR_STATUS = 500;
const DELETED_OUTCOME = 'deleted';

type CaptchaToken = { captchaToken?: string | undefined };

function siteUrlWithRedirect(path: '/' | '/auth/callback', redirect: string | undefined): string {
  const safeRedirect = safeRedirectPath(redirect, '');
  if (path === '/' && !safeRedirect) {
    return env.siteUrl;
  }
  const url = new URL(path, env.siteUrl);
  if (safeRedirect) {
    url.searchParams.set('redirect', safeRedirect);
  }
  return url.toString();
}

async function signOutWithoutFailing(scope: 'others' | 'local') {
  const { error } = await supabase.auth.signOut({ scope });
  if (error) {
    logger.warn('Sign-out after an account change failed', { scope, code: error.code });
  }
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
    options: { redirectTo: siteUrlWithRedirect('/auth/callback', redirect) },
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
  phone,
  locale,
  redirect,
  captchaToken,
}: SignUpPayload & CaptchaToken): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { locale, full_name: fullName, phone },
      emailRedirectTo: siteUrlWithRedirect('/', redirect),
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
  const sentAt = data.user.confirmation_sent_at;
  const isResent =
    sentAt !== undefined &&
    Date.parse(sentAt) - Date.parse(data.user.created_at) > REPEATED_SIGN_UP_AGE_MS;
  return { status: isResent ? 'confirmation_resent' : 'confirmation_sent' };
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
    options: { emailRedirectTo: siteUrlWithRedirect('/', redirect), captchaToken },
  });
  if (error) throw toAppError(error);
}

export type EmailLinkResult =
  { status: 'verified'; hasSession: boolean } | { status: 'expired' | 'invalid' };

export async function verifyEmailLink({
  token_hash: tokenHash,
  type,
}: AuthConfirmSearch): Promise<EmailLinkResult> {
  if (!tokenHash || !type) {
    return { status: 'invalid' };
  }
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type === 'signup' ? 'email' : type,
  });
  if (!error) {
    return { status: 'verified', hasSession: data.session !== null };
  }
  const appError = toAppError(error);
  if (appError.reason === 'link_expired') {
    return { status: 'expired' };
  }
  if (appError.code === 'network' || (error.status ?? 0) >= SERVER_ERROR_STATUS) {
    throw appError;
  }
  return { status: 'invalid' };
}

type PasswordResetRequest = CaptchaToken & { email: string };

export async function requestPasswordReset({ email, captchaToken }: PasswordResetRequest) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: siteUrlWithRedirect('/', '/password-reset/new'),
    captchaToken,
  });
  if (error) throw toAppError(error);
}

export async function getAccountHasPassword(): Promise<boolean> {
  const { data, error } = await supabase.rpc('account_has_password');
  if (error) throw toAppError(error);
  return data;
}

type PasswordChange = {
  currentPassword: string | undefined;
  password: string;
};

export async function changePassword({ currentPassword, password }: PasswordChange) {
  const { error } = await supabase.auth.updateUser({
    password,
    ...(currentPassword ? { current_password: currentPassword } : {}),
  });
  if (error) throw toAppError(error);
  await signOutWithoutFailing('others');
}

export async function deleteOwnAccount(confirmation: string) {
  const { data, error } = await supabase.rpc('delete_own_account', { confirmation });
  if (error) throw toAppError(error);
  if (data !== DELETED_OUTCOME) {
    throw toAppError({ code: 'P0001', message: data, details: null });
  }
  await signOutWithoutFailing('local');
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw toAppError(error);
}
