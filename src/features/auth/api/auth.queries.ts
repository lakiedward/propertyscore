import { queryOptions, useMutation } from '@tanstack/react-query';
import type { AuthConfirmSearch } from '../auth.schemas';
import {
  listEnabledSocialProviders,
  requestPasswordReset,
  resendConfirmation,
  signInWithPassword,
  signInWithProvider,
  signOut,
  signUp,
  updatePassword,
  verifyEmailLink,
} from './auth.api';

export const authQueries = {
  all: () => ['auth'] as const,
  socialProviders: () =>
    queryOptions({
      queryKey: [...authQueries.all(), 'social-providers'],
      queryFn: listEnabledSocialProviders,
      staleTime: Infinity,
    }),
  emailLink: ({ token_hash: tokenHash, type }: Pick<AuthConfirmSearch, 'token_hash' | 'type'>) =>
    queryOptions({
      queryKey: [...authQueries.all(), 'email-link', tokenHash, type],
      queryFn: () => verifyEmailLink({ token_hash: tokenHash, type }),
      staleTime: Infinity,
      gcTime: Infinity,
      retry: false,
    }),
};

export function useSignIn() {
  return useMutation({ mutationFn: signInWithPassword, meta: { silent: true } });
}

export function useSignInWithProvider() {
  return useMutation({ mutationFn: signInWithProvider, meta: { silent: true } });
}

export function useSignUp() {
  return useMutation({ mutationFn: signUp, meta: { silent: true } });
}

export function useResendConfirmation() {
  return useMutation({ mutationFn: resendConfirmation, meta: { silent: true } });
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset, meta: { silent: true } });
}

export function useUpdatePassword() {
  return useMutation({ mutationFn: updatePassword, meta: { silent: true } });
}

export function useSignOut() {
  return useMutation({ mutationFn: signOut });
}
