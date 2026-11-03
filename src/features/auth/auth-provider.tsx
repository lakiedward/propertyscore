import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { getRoles, getSession, subscribeToAuthChanges } from './api/auth.api';
import { AuthContext, createAuthState, type AuthState } from './auth-context';
import type { AppRole } from './auth.types';

type AuthProviderProps = {
  children: ReactNode;
};

async function resolveRoles(session: Session | null): Promise<AppRole[]> {
  if (!session) {
    return [];
  }
  try {
    return await getRoles(session.access_token);
  } catch (error) {
    logger.error(error);
    return [];
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [auth, setAuth] = useState<AuthState>();

  useEffect(() => {
    let isActive = true;
    let latestRequest = 0;
    let hasAuthEvent = false;

    const resolve = (session: Session | null) => {
      latestRequest += 1;
      const request = latestRequest;
      void resolveRoles(session).then((roles) => {
        if (isActive && request === latestRequest) {
          setAuth(createAuthState(session, roles));
        }
      });
    };

    getSession()
      .then((initialSession) => {
        if (!hasAuthEvent) resolve(initialSession);
      })
      .catch((error: unknown) => {
        logger.error(error);
        if (!hasAuthEvent) resolve(null);
      });
    const unsubscribe = subscribeToAuthChanges((event, nextSession) => {
      hasAuthEvent = true;
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
      }
      setTimeout(() => {
        resolve(nextSession);
      }, 0);
    });
    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [queryClient]);

  const userId = auth?.user?.id ?? null;
  useEffect(() => {
    logger.setUser(userId);
  }, [userId]);

  if (!auth) {
    return null;
  }

  return <AuthContext value={auth}>{children}</AuthContext>;
}
