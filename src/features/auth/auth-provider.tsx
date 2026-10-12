import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { getSession, subscribeToAuthChanges } from './api/auth.api';
import { AuthContext } from './auth-context';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let isActive = true;
    getSession()
      .then((initialSession) => {
        if (isActive) setSession((current) => (current === undefined ? initialSession : current));
      })
      .catch((error: unknown) => {
        logger.error(error);
        if (isActive) setSession(null);
      });
    const unsubscribe = subscribeToAuthChanges((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
      }
      setSession(nextSession);
    });
    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    logger.setUser(userId);
  }, [userId]);

  if (session === undefined) {
    return null;
  }

  return <AuthContext value={{ session, user: session?.user ?? null }}>{children}</AuthContext>;
}
