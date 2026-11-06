import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AuthConfirmSearch } from '../auth.schemas';
import {
  changePassword,
  deleteOwnAccount,
  getAccountHasPassword,
  getAccountPhone,
  listEnabledSocialProviders,
  requestPasswordReset,
  resendConfirmation,
  signInWithPassword,
  signInWithProvider,
  signOut,
  signUp,
  updateAccountPhone,
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
  accountHasPasswordAll: () => [...authQueries.all(), 'account-has-password'] as const,
  accountHasPassword: (userId: string) =>
    queryOptions({
      queryKey: [...authQueries.accountHasPasswordAll(), userId],
      queryFn: getAccountHasPassword,
    }),
  accountPhone: (userId: string) =>
    queryOptions({
      queryKey: [...authQueries.all(), 'account-phone', userId],
      queryFn: () => getAccountPhone(userId),
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

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: changePassword,
    meta: { silent: true },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: authQueries.accountHasPasswordAll() }),
  });
}

export function useUpdateAccountPhone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAccountPhone,
    meta: { silent: true },
    onSuccess: (phone, { userId }) => {
      queryClient.setQueryData(authQueries.accountPhone(userId).queryKey, phone);
    },
  });
}

export function useDeleteOwnAccount() {
  return useMutation({ mutationFn: deleteOwnAccount, meta: { silent: true } });
}

export function useSignOut() {
  return useMutation({ mutationFn: signOut });
}
