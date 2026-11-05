import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AuthConfirmSearch } from '../auth.schemas';
import {
  changePassword,
  deleteOwnAccount,
  getAccountHasPassword,
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
  accountHasPassword: (userId: string) =>
    queryOptions({
      queryKey: [...authQueries.all(), 'account-has-password', userId],
      queryFn: getAccountHasPassword,
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

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: changePassword,
    meta: { silent: true },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [...authQueries.all(), 'account-has-password'] }),
  });
}

export function useDeleteOwnAccount() {
  return useMutation({ mutationFn: deleteOwnAccount, meta: { silent: true } });
}

export function useSignOut() {
  return useMutation({ mutationFn: signOut });
}
