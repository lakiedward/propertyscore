import { z } from 'zod';
import {
  PANEL_PATHS,
  SETTINGS_PATHS,
  type PanelPath,
  type SettingsPath,
} from '@/components/layout/panel-paths';
import { Constants } from '@/lib/supabase/database.types';
import { EXPIRED_LINK_CODES } from '@/lib/supabase/errors';
import { safeRedirectPath } from '@/lib/url';
import type { AppRole, EmailLinkType, SignInMethod } from './auth.types';

const APP_ROLES: readonly string[] = Constants.public.Enums.app_role;
const ADMIN_PATH = /^\/admin(?:[/?#]|$)/u;
const LINK_SIGN_IN_METHOD = 'otp';
const LINK_SIGN_IN_WINDOW_SECONDS = 900;

const accessTokenClaimsSchema = z.object({
  user_roles: z.array(z.string()).catch([]),
  amr: z
    .array(z.object({ method: z.string(), timestamp: z.number() }))
    .optional()
    .catch(undefined),
});

function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value);
}

function readAccessTokenClaims(accessToken: string | undefined) {
  const payload = accessToken?.split('.')[1];
  if (!payload) {
    return undefined;
  }
  try {
    const json = atob(payload.replace(/-/gu, '+').replace(/_/gu, '/'));
    const bytes = Uint8Array.from(json, (character) => character.charCodeAt(0));
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
    const parsed = accessTokenClaimsSchema.safeParse(claims);
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function rolesFromAccessToken(accessToken: string | undefined): AppRole[] {
  return readAccessTokenClaims(accessToken)?.user_roles.filter(isAppRole) ?? [];
}

export function signInMethodFromAccessToken(
  accessToken: string | undefined,
): SignInMethod | undefined {
  const entries = readAccessTokenClaims(accessToken)?.amr ?? [];
  const latest = entries.reduce<(typeof entries)[number] | undefined>(
    (current, entry) => (!current || entry.timestamp > current.timestamp ? entry : current),
    undefined,
  );
  return latest ? { method: latest.method, signedInAt: latest.timestamp } : undefined;
}

export function isRecentLinkSignIn(
  signInMethod: SignInMethod | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  return (
    signInMethod?.method === LINK_SIGN_IN_METHOD &&
    nowSeconds - signInMethod.signedInAt <= LINK_SIGN_IN_WINDOW_SECONDS
  );
}

export function homePathFor(roles: readonly AppRole[]): PanelPath {
  if (roles.includes('admin')) {
    return PANEL_PATHS.admin;
  }
  return roles.includes('inspector') ? PANEL_PATHS.field : PANEL_PATHS.account;
}

export function settingsPathFor(roles: readonly AppRole[]): SettingsPath {
  return roles.includes('admin') ? SETTINGS_PATHS.admin : SETTINGS_PATHS.account;
}

export function postSignInPath(roles: readonly AppRole[], redirect: string | undefined): string {
  const home = homePathFor(roles);
  const path = safeRedirectPath(redirect, home);
  return ADMIN_PATH.test(path) && !roles.includes('admin') ? home : path;
}

function redirectFromEmailLink(next: string | undefined): string | undefined {
  if (!next) {
    return undefined;
  }
  try {
    return new URL(next).searchParams.get('redirect') ?? undefined;
  } catch {
    return undefined;
  }
}

export function emailLinkTarget(
  type: EmailLinkType | undefined,
  next: string | undefined,
  roles: readonly AppRole[],
): string {
  if (type === 'recovery') {
    return '/password-reset/new';
  }
  if (type === 'email_change') {
    return settingsPathFor(roles);
  }
  return postSignInPath(roles, redirectFromEmailLink(next));
}

export function isExpiredLinkCode(code: string | undefined): boolean {
  return code !== undefined && EXPIRED_LINK_CODES.includes(code);
}
