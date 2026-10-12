import type { Session, User } from '@supabase/supabase-js';
import { createContext, use } from 'react';

export type AuthState = {
  session: Session | null;
  user: User | null;
};

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const auth = use(AuthContext);
  if (!auth) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return auth;
}
