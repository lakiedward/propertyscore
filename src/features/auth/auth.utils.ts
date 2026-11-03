import { safeRedirectPath } from '@/lib/url';
import type { AppRole } from './auth.types';

export function homePathFor(roles: readonly AppRole[]): '/admin' | '/account' {
  return roles.includes('admin') ? '/admin' : '/account';
}

export function postSignInPath(roles: readonly AppRole[], redirect: string | undefined): string {
  return safeRedirectPath(redirect, homePathFor(roles));
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
  type: 'signup' | 'email' | 'recovery' | 'email_change' | undefined,
  next: string | undefined,
  roles: readonly AppRole[],
): string {
  if (type === 'recovery') {
    return '/password-reset/new';
  }
  if (type === 'email_change') {
    return '/account/settings';
  }
  return postSignInPath(roles, redirectFromEmailLink(next));
}
