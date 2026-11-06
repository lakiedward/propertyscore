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

const PHONE_SEPARATORS = /[\s.()/-]/gu;
const ROMANIAN_NATIONAL_PHONE = /^0[1-9]\d{8}$/u;
const ROMANIAN_PHONE = /^\+40\d{9}$/u;
const INTERNATIONAL_PHONE = /^\+[1-9]\d{7,14}$/u;

export function toE164Phone(value: string): string {
  const compact = value.replace(PHONE_SEPARATORS, '');
  if (compact.startsWith('00')) {
    return `+${compact.slice(2)}`;
  }
  if (ROMANIAN_NATIONAL_PHONE.test(compact)) {
    return `+40${compact.slice(1)}`;
  }
  return compact;
}

export function isPhoneNumber(value: string): boolean {
  const phone = toE164Phone(value);
  return phone.startsWith('+40') ? ROMANIAN_PHONE.test(phone) : INTERNATIONAL_PHONE.test(phone);
}
