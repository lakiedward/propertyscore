import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { inspectionQueries } from '@/features/inspections';
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

type InspectionReach = 'schedule' | 'all';

function useInvalidateUsers(reach: InspectionReach) {
  const queryClient = useQueryClient();
  const inspectionKeys =
    reach === 'all'
      ? [inspectionQueries.all()]
      : [inspectionQueries.scheduleAll(), inspectionQueries.slotsAll()];
  return () =>
    Promise.all(
      [staffQueries.usersLists(), staffQueries.roleCounts().queryKey, ...inspectionKeys].map(
        (queryKey) => queryClient.invalidateQueries({ queryKey }),
      ),
    );
}

export function useSetInspector() {
  const invalidate = useInvalidateUsers('schedule');
  return useMutation({ mutationFn: setInspector, onSuccess: invalidate });
}

export function useRemoveInspector() {
  const invalidate = useInvalidateUsers('all');
  return useMutation({ mutationFn: removeInspector, onSuccess: invalidate });
}

function useInvalidateAvailability() {
  const queryClient = useQueryClient();
  return (inspectorId: string) =>
    Promise.all(
      [
        staffQueries.availability(inspectorId),
        inspectionQueries.scheduleAll(),
        inspectionQueries.slotsAll(),
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
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
  const invalidate = useInvalidateUsers('all');
  return useMutation({ mutationFn: blockUser, meta: { silent: true }, onSuccess: invalidate });
}

export function useUnblockUser() {
  const invalidate = useInvalidateUsers('schedule');
  return useMutation({ mutationFn: unblockUser, onSuccess: invalidate });
}

export function useMakeAdmin() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: staffQueries.usersLists() }),
      queryClient.invalidateQueries({ queryKey: staffQueries.roleCounts().queryKey }),
    ]);
  return useMutation({ mutationFn: makeAdmin, onSuccess: invalidate });
}
