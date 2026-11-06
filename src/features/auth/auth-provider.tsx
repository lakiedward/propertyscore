import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { subscribeToAuthChanges } from './api/auth.api';
import { AuthContext, createAuthState, type AuthState } from './auth-context';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [auth, setAuth] = useState<AuthState>();

  useEffect(
    () =>
      subscribeToAuthChanges((event, session) => {
        if (event === 'SIGNED_OUT') {
          queryClient.clear();
        }
        setAuth(createAuthState(session));
      }),
    [queryClient],
  );

  const userId = auth?.user?.id ?? null;
  useEffect(() => {
    logger.setUser(userId);
  }, [userId]);

  if (!auth) {
    return null;
  }

  return <AuthContext value={auth}>{children}</AuthContext>;
}
