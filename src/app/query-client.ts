import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { signOut } from '@/features/auth';
import { translateError } from '@/i18n/error-message';
import { isAppError, isExpectedError } from '@/lib/errors';
import { logger } from '@/lib/logger';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: { silent?: boolean };
  }
}

const MAX_RETRIES = 2;

function handleUnauthenticated(error: unknown) {
  if (isAppError(error) && error.code === 'unauthenticated') {
    signOut().catch((signOutError: unknown) => {
      logger.error(signOutError);
    });
  }
}

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: handleUnauthenticated,
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) => {
        handleUnauthenticated(error);
        logger.error(error);
        if (!mutation.meta?.silent) {
          toast.error(translateError(error));
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => !isExpectedError(error) && failureCount < MAX_RETRIES,
      },
    },
  });
}
