import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { listUnlimitedAccounts, setSmartCheckUnlimited } from './unlimited-access.api';

export const unlimitedAccessQueries = {
  all: () => ['smart-check', 'unlimited-accounts'] as const,
  list: () =>
    queryOptions({
      queryKey: unlimitedAccessQueries.all(),
      queryFn: listUnlimitedAccounts,
    }),
};

export function useSetSmartCheckUnlimited() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setSmartCheckUnlimited,
    meta: { silent: true },
    onSettled: () => queryClient.invalidateQueries({ queryKey: unlimitedAccessQueries.all() }),
  });
}
