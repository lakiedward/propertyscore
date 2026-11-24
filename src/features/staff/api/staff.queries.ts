import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { UserFilters } from '../staff.types';
import {
  addException,
  blockUser,
  unblockUser,
  getInspectorProfile,
  listCities,
  listExceptions,
  listRoleCounts,
  listUsers,
  listWeeklyHours,
  makeAdmin,
  removeException,
  removeInspector,
  setInspector,
  setWeeklyHours,
} from './staff.api';

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
  availability: (inspectorId: string) =>
    [...staffQueries.all(), 'availability', inspectorId] as const,
  inspectorProfile: (inspectorId: string) =>
    queryOptions({
      queryKey: [...staffQueries.availability(inspectorId), 'profile'],
      queryFn: () => getInspectorProfile(inspectorId),
    }),
  weeklyHours: (inspectorId: string) =>
    queryOptions({
      queryKey: [...staffQueries.availability(inspectorId), 'weekly'],
      queryFn: () => listWeeklyHours(inspectorId),
    }),
  exceptions: (inspectorId: string, from: string) =>
    queryOptions({
      queryKey: [...staffQueries.availability(inspectorId), 'exceptions', from],
      queryFn: () => listExceptions(inspectorId, from),
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

function useInvalidateAvailability() {
  const queryClient = useQueryClient();
  return (inspectorId: string) =>
    queryClient.invalidateQueries({ queryKey: staffQueries.availability(inspectorId) });
}

export function useSetWeeklyHours() {
  const invalidate = useInvalidateAvailability();
  return useMutation({
    mutationFn: setWeeklyHours,
    onSettled: (_data, _error, variables) => invalidate(variables.inspectorId),
  });
}

export function useAddException() {
  const invalidate = useInvalidateAvailability();
  return useMutation({
    mutationFn: addException,
    onSuccess: (_data, variables) => invalidate(variables.inspectorId),
  });
}

export function useRemoveException(inspectorId: string) {
  const invalidate = useInvalidateAvailability();
  return useMutation({
    mutationFn: removeException,
    onSuccess: () => invalidate(inspectorId),
  });
}

export function useBlockUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: blockUser, meta: { silent: true }, onSuccess: invalidate });
}

export function useUnblockUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: unblockUser, onSuccess: invalidate });
}

export function useMakeAdmin() {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: makeAdmin, onSuccess: invalidate });
}
