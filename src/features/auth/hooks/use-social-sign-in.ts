import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { authQueries, useSignInWithProvider } from '../api/auth.queries';
import type { SocialProvider } from '../auth.types';

export type SocialSignInNotice = {
  kind: 'unavailable' | 'failed';
  provider: SocialProvider;
};

export function useSocialSignIn(redirect: string | undefined) {
  const queryClient = useQueryClient();
  const signIn = useSignInWithProvider();
  const [notice, setNotice] = useState<SocialSignInNotice>();

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
