import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { UserFilters } from '../staff.types';
import { listCities, listRoleCounts, listUsers, removeInspector, setInspector } from './staff.api';

const CITIES_STALE_MS = 3_600_000;

export const staffQueries = {
  all: () => ['staff'] as const,
  usersLists: () => [...staffQueries.all(), 'users'] as const,
  users: (filters: UserFilters) =>
    infiniteQueryOptions({
      queryKey: [...staffQueries.usersLists(), filters],
      queryFn: ({ pageParam }) => listUsers(filters, pageParam),
      initialPageParam: 0,
      getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length : undefined),
    }),
  roleCounts: () =>
    queryOptions({
      queryKey: [...staffQueries.all(), 'role-counts'],
      queryFn: listRoleCounts,
    }),
  cities: () =>
    queryOptions({
      queryKey: [...staffQueries.all(), 'cities'],
      queryFn: listCities,
      staleTime: CITIES_STALE_MS,
    }),
};

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: staffQueries.usersLists() }),
      queryClient.invalidateQueries({ queryKey: staffQueries.roleCounts().queryKey }),
    ]);
}

export function useSetInspector() {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: setInspector, onSuccess: invalidate });
}

export function useRemoveInspector() {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: removeInspector, onSuccess: invalidate });
}
