import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AgendaRange } from '../inspection.types';
import {
  cancelInspection,
  listInspectionHistory,
  listMyInspections,
  rescheduleInspection,
} from './appointments.api';
import {
  bookInspection,
  getBookedInspection,
  listInspectionCities,
  listInspectionSlots,
  listMyBookableProperties,
} from './booking.api';
import { listInspectorAgenda } from './inspections.api';
import {
  assignInspector,
  cancelInspectionAsAdmin,
  listAdminInspections,
  listAdminInspectors,
  listInspectorBlocks,
  listUnassignedInspections,
  listWorkingRanges,
  unassignInspector,
} from './schedule.api';

const CITIES_STALE_MS = 3_600_000;

export const inspectionQueries = {
  all: () => ['inspections'] as const,
  agenda: (range: AgendaRange) =>
    queryOptions({
      queryKey: [...inspectionQueries.all(), 'agenda', range],
      queryFn: () => listInspectorAgenda(range),
    }),
  cities: () =>
    queryOptions({
      queryKey: [...inspectionQueries.all(), 'cities'],
      queryFn: listInspectionCities,
      staleTime: CITIES_STALE_MS,
    }),
  bookableProperties: (userId: string) =>
    queryOptions({
      queryKey: [...inspectionQueries.all(), 'bookable-properties', userId],
      queryFn: listMyBookableProperties,
    }),
  slotsAll: () => [...inspectionQueries.all(), 'slots'] as const,
  slots: (cityId: string, from: string, to: string) =>
    queryOptions({
      queryKey: [...inspectionQueries.slotsAll(), cityId, from, to],
      queryFn: () => listInspectionSlots(cityId, from, to),
    }),
  mine: (userId: string) =>
    queryOptions({
      queryKey: [...inspectionQueries.all(), 'mine', userId],
      queryFn: listMyInspections,
    }),
  history: (inspectionId: string) =>
    queryOptions({
      queryKey: [...inspectionQueries.all(), 'history', inspectionId],
      queryFn: () => listInspectionHistory(inspectionId),
    }),
  scheduleAll: () => [...inspectionQueries.all(), 'schedule'] as const,
  schedule: (from: string, to: string, cityId: string | null) =>
    queryOptions({
      queryKey: [...inspectionQueries.scheduleAll(), 'board', from, to, cityId],
      queryFn: () => listAdminInspections({ from, to, cityId }),
    }),
  unassigned: (cityId: string | null) =>
    queryOptions({
      queryKey: [...inspectionQueries.scheduleAll(), 'unassigned', cityId],
      queryFn: () => listUnassignedInspections(cityId),
    }),
  inspectors: (cityId: string | null) =>
    queryOptions({
      queryKey: [...inspectionQueries.scheduleAll(), 'inspectors', cityId],
      queryFn: () => listAdminInspectors(cityId),
    }),
  workingRanges: (inspectorIds: readonly string[]) =>
    queryOptions({
      queryKey: [...inspectionQueries.scheduleAll(), 'working-ranges', inspectorIds],
      queryFn: () => listWorkingRanges(inspectorIds),
    }),
  blocks: (inspectorIds: readonly string[], from: string, to: string) =>
    queryOptions({
      queryKey: [...inspectionQueries.scheduleAll(), 'blocks', inspectorIds, from, to],
      queryFn: () => listInspectorBlocks(inspectorIds, from, to),
    }),
  booked: (id: string) =>
    queryOptions({
      queryKey: [...inspectionQueries.all(), 'booked', id],
      queryFn: () => getBookedInspection(id),
    }),
};

export function useBookInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bookInspection,
    meta: { silent: true },
    onSettled: () => queryClient.invalidateQueries({ queryKey: inspectionQueries.all() }),
  });
}

export function useRescheduleInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rescheduleInspection,
    meta: { silent: true },
    onSettled: () => queryClient.invalidateQueries({ queryKey: inspectionQueries.all() }),
  });
}

export function useCancelInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelInspection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inspectionQueries.all() }),
  });
}

export function useAssignInspector() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignInspector,
    meta: { silent: true },
    onSettled: () => queryClient.invalidateQueries({ queryKey: inspectionQueries.all() }),
  });
}

export function useUnassignInspector() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unassignInspector,
    onSettled: () => queryClient.invalidateQueries({ queryKey: inspectionQueries.all() }),
  });
}

export function useCancelInspectionAsAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelInspectionAsAdmin,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inspectionQueries.all() }),
  });
}
