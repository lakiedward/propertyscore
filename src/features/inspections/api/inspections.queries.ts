import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AgendaRange } from '../inspection.types';
import {
  bookInspection,
  getBookedInspection,
  listInspectionCities,
  listInspectionSlots,
  listMyBookableProperties,
} from './booking.api';
import { listInspectorAgenda } from './inspections.api';

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
