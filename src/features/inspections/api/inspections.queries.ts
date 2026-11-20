import { queryOptions } from '@tanstack/react-query';
import type { AgendaRange } from '../inspection.types';
import { listInspectorAgenda } from './inspections.api';

export const inspectionQueries = {
  all: () => ['inspections'] as const,
  agenda: (range: AgendaRange) =>
    queryOptions({
      queryKey: [...inspectionQueries.all(), 'agenda', range],
      queryFn: () => listInspectorAgenda(range),
    }),
};
