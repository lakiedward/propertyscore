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
const SETTINGS_PATH_LIST: readonly string[] = Object.values(SETTINGS_PATHS);
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
  const home = homePathFor(roles);
  if (home === PANEL_PATHS.admin) {
    return SETTINGS_PATHS.admin;
  }
  return home === PANEL_PATHS.field ? SETTINGS_PATHS.field : SETTINGS_PATHS.account;
}

function panelOf(path: string): PanelPath | undefined {
  return Object.values(PANEL_PATHS).find(
    (panel) =>
      path === panel || (path.startsWith(panel) && /^[/?#]/u.test(path.slice(panel.length))),
  );
}

export function otherPanelRedirect(
  roles: readonly AppRole[],
  pathname: string,
): PanelPath | SettingsPath | null {
  const panel = panelOf(pathname);
  const home = homePathFor(roles);
  if (panel === undefined || panel === home) {
    return null;
  }
  const isSettings = SETTINGS_PATH_LIST.includes(pathname.replace(/\/$/u, ''));
  return isSettings ? settingsPathFor(roles) : home;
}

export function postSignInPath(roles: readonly AppRole[], redirect: string | undefined): string {
  const home = homePathFor(roles);
  const path = safeRedirectPath(redirect, home);
  const panel = panelOf(path);
  return panel !== undefined && panel !== home ? home : path;
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
