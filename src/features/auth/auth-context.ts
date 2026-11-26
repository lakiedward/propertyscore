import type { Session, User } from '@supabase/supabase-js';
import { redirect } from '@tanstack/react-router';
import { createContext, use } from 'react';
import type { AppRole, SignInMethod } from './auth.types';
import {
  otherPanelRedirect,
  postSignInPath,
  rolesFromAccessToken,
  settingsPathFor,
  signInMethodFromAccessToken,
} from './auth.utils';

export type AuthState = {
  session: Session | null;
  user: User | null;
  roles: readonly AppRole[];
  signInMethod: SignInMethod | undefined;
  hasRole: (role: AppRole) => boolean;
};

export function createAuthState(
  session: Session | null,
  roles: readonly AppRole[] = rolesFromAccessToken(session?.access_token),
): AuthState {
  return {
    session,
    user: session?.user ?? null,
    roles,
    signInMethod: signInMethodFromAccessToken(session?.access_token),
    hasRole: (role) => roles.includes(role),
  };
}

export function signedInRedirect(auth: AuthState, target?: string) {
  return auth.session ? redirect({ href: postSignInPath(auth.roles, target) }) : undefined;
}

export function otherPanelGuard(
  auth: AuthState,
  location: { pathname: string; search: Record<string, unknown> },
) {
  const target = otherPanelRedirect(auth.roles, location.pathname);
  if (target === null) {
    return undefined;
  }
  const keepsSearch = target === settingsPathFor(auth.roles);
  return redirect({ to: target, search: keepsSearch ? location.search : {} });
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const auth = use(AuthContext);
  if (!auth) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return auth;
}
