import { safeRedirectPath } from '@/lib/url';
import type { AppRole } from './auth.types';

export function homePathFor(roles: readonly AppRole[]): '/admin' | '/account' {
  return roles.includes('admin') ? '/admin' : '/account';
}

export function postSignInPath(roles: readonly AppRole[], redirect: string | undefined): string {
  return safeRedirectPath(redirect, homePathFor(roles));
}
