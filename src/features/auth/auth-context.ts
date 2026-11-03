import type { Session, User } from '@supabase/supabase-js';
import { createContext, use } from 'react';
import type { AppRole } from './auth.types';

export type AuthState = {
  session: Session | null;
  user: User | null;
  roles: readonly AppRole[];
  hasRole: (role: AppRole) => boolean;
};

export function createAuthState(
  session: Session | null,
  roles: readonly AppRole[] = [],
): AuthState {
  return {
    session,
    user: session?.user ?? null,
    roles,
    hasRole: (role) => roles.includes(role),
  };
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const auth = use(AuthContext);
  if (!auth) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return auth;
}
