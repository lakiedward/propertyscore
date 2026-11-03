import { queryOptions, useMutation } from '@tanstack/react-query';
import {
  listEnabledSocialProviders,
  requestPasswordReset,
  signInWithPassword,
  signInWithProvider,
  signOut,
  signUp,
  updatePassword,
} from './auth.api';

export const authQueries = {
  all: () => ['auth'] as const,
  socialProviders: () =>
    queryOptions({
      queryKey: [...authQueries.all(), 'social-providers'],
      queryFn: listEnabledSocialProviders,
      staleTime: Infinity,
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

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset, meta: { silent: true } });
}

export function useUpdatePassword() {
  return useMutation({ mutationFn: updatePassword, meta: { silent: true } });
}

export function useSignOut() {
  return useMutation({ mutationFn: signOut });
}
