import { http, HttpResponse } from 'msw';
import type { AgendaInspection } from '@/features/inspections';
import { supabaseUrl } from '../supabase-url';

export function agendaResponse(inspections: readonly AgendaInspection[]) {
  return http.post(supabaseUrl('/rest/v1/rpc/inspector_agenda'), () =>
    HttpResponse.json(inspections),
  );
}

export const inspectionHandlers = [agendaResponse([])];
