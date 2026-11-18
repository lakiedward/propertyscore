import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { authQueries } from '@/features/auth';
import { getProfile, updateProfileLocale } from './profile.api';

export const profileQueries = {
  all: () => ['profiles'] as const,
  detail: (userId: string) =>
    queryOptions({
      queryKey: [...profileQueries.all(), 'detail', userId],
      queryFn: () => getProfile(userId),
    }),
};

export function useUpdateProfileLocale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfileLocale,
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueries.detail(profile.id).queryKey, profile);
    },
  });
}

export function loadAccountSettings(queryClient: QueryClient, userId: string) {
  return Promise.all([
    queryClient.query({ ...authQueries.accountHasPassword(userId), staleTime: 'static' }),
    queryClient.query({ ...authQueries.accountPhone(userId), staleTime: 'static' }),
  ]);
}
