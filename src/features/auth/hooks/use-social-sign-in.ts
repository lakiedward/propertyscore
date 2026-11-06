import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { authQueries, useSignInWithProvider } from '../api/auth.queries';
import type { SocialNotice, SocialProvider } from '../auth.types';

export function useSocialSignIn(redirect: string | undefined) {
  const queryClient = useQueryClient();
  const signIn = useSignInWithProvider();
  const [notice, setNotice] = useState<SocialNotice>();

  const select = async (provider: SocialProvider) => {
    setNotice(undefined);
    try {
      const enabledProviders = await queryClient.query(authQueries.socialProviders());
      if (!enabledProviders.includes(provider)) {
        setNotice({ kind: 'unavailable', provider });
        return;
      }
      await signIn.mutateAsync({ provider, redirect });
    } catch {
      setNotice({ kind: 'failed', provider });
    }
  };

  return {
    notice,
    pendingProvider: signIn.isPending ? signIn.variables.provider : undefined,
    select,
    clearNotice: () => {
      setNotice(undefined);
    },
  };
}
