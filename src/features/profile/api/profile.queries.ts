import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
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
