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
  countUnassignedInspections,
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
  agendaAll: () => [...inspectionQueries.all(), 'agenda'] as const,
  agenda: (range: AgendaRange) =>
    queryOptions({
      queryKey: [...inspectionQueries.agendaAll(), range],
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
  mineAll: () => [...inspectionQueries.all(), 'mine'] as const,
  mine: (userId: string) =>
    queryOptions({
      queryKey: [...inspectionQueries.mineAll(), userId],
      queryFn: listMyInspections,
    }),
  historyAll: () => [...inspectionQueries.all(), 'history'] as const,
  history: (inspectionId: string) =>
    queryOptions({
      queryKey: [...inspectionQueries.historyAll(), inspectionId],
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
  unassignedCount: () =>
    queryOptions({
      queryKey: [...inspectionQueries.scheduleAll(), 'unassigned-count'],
      queryFn: countUnassignedInspections,
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
  bookedAll: () => [...inspectionQueries.all(), 'booked'] as const,
  booked: (id: string) =>
    queryOptions({
      queryKey: [...inspectionQueries.bookedAll(), id],
      queryFn: () => getBookedInspection(id),
    }),
};

function useInvalidateBookingChanges() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [
        inspectionQueries.scheduleAll(),
        inspectionQueries.slotsAll(),
        inspectionQueries.mineAll(),
        inspectionQueries.historyAll(),
        inspectionQueries.agendaAll(),
        inspectionQueries.bookedAll(),
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}

export function useBookInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bookInspection,
    meta: { silent: true },
    onSettled: () => queryClient.invalidateQueries({ queryKey: inspectionQueries.all() }),
  });
}

export function useRescheduleInspection() {
  const invalidate = useInvalidateBookingChanges();
  return useMutation({
    mutationFn: rescheduleInspection,
    meta: { silent: true },
    onSettled: invalidate,
  });
}

export function useCancelInspection() {
  const invalidate = useInvalidateBookingChanges();
  return useMutation({
    mutationFn: cancelInspection,
    onSuccess: invalidate,
  });
}

export function useAssignInspector() {
  const invalidate = useInvalidateBookingChanges();
  return useMutation({
    mutationFn: assignInspector,
    meta: { silent: true },
    onSettled: invalidate,
  });
}

export function useUnassignInspector() {
  const invalidate = useInvalidateBookingChanges();
  return useMutation({
    mutationFn: unassignInspector,
    onSettled: invalidate,
  });
}

export function useCancelInspectionAsAdmin() {
  const invalidate = useInvalidateBookingChanges();
  return useMutation({
    mutationFn: cancelInspectionAsAdmin,
    onSuccess: invalidate,
  });
}
