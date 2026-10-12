import { useMutation } from '@tanstack/react-query';
import { signInWithPassword, signOut, signUp } from './auth.api';

export function useSignIn() {
  return useMutation({ mutationFn: signInWithPassword, meta: { silent: true } });
}

export function useSignUp() {
  return useMutation({ mutationFn: signUp, meta: { silent: true } });
}

export function useSignOut() {
  return useMutation({ mutationFn: signOut });
}
