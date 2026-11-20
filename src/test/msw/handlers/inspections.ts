import { http, HttpResponse } from 'msw';
import type { AgendaInspection, MyInspection } from '@/features/inspections';
import { supabaseUrl } from '../supabase-url';

export const TIMISOARA_ID = 'c4000000-0000-4000-8000-000000000001';

export function agendaResponse(inspections: readonly AgendaInspection[]) {
  return http.post(supabaseUrl('/rest/v1/rpc/inspector_agenda'), () =>
    HttpResponse.json(inspections),
  );
}

export function bookablePropertiesResponse(rows: readonly Record<string, unknown>[]) {
  return http.post(supabaseUrl('/rest/v1/rpc/my_bookable_properties'), () =>
    HttpResponse.json(rows),
  );
}

export function slotsResponse(
  rows: readonly { starts_at: string; working: number; free: number }[],
) {
  return http.post(supabaseUrl('/rest/v1/rpc/inspection_slots'), () => HttpResponse.json(rows));
}

export function myInspectionsResponse(rows: readonly MyInspection[]) {
  return http.post(supabaseUrl('/rest/v1/rpc/my_inspections'), () => HttpResponse.json(rows));
}

export const inspectionHandlers = [
  myInspectionsResponse([]),
  http.post(supabaseUrl('/rest/v1/rpc/inspection_history'), () =>
    HttpResponse.json([
      {
        kind: 'booked',
        actor_name: 'Ion Țurcanu',
        details: {},
        created_at: '2026-11-18T09:00:00.000Z',
      },
    ]),
  ),
  http.post(
    supabaseUrl('/rest/v1/rpc/reschedule_inspection'),
    () => new HttpResponse(null, { status: 204 }),
  ),
  http.post(
    supabaseUrl('/rest/v1/rpc/cancel_inspection'),
    () => new HttpResponse(null, { status: 204 }),
  ),
  agendaResponse([]),
  bookablePropertiesResponse([]),
  slotsResponse([]),
  http.post(supabaseUrl('/rest/v1/rpc/inspection_cities'), () =>
    HttpResponse.json([
      {
        id: TIMISOARA_ID,
        slug: 'timisoara',
        name: 'Timișoara',
        latitude: 45.7558,
        longitude: 21.229,
        has_inspectors: true,
      },
      {
        id: 'c4000000-0000-4000-8000-000000000009',
        slug: 'brasov',
        name: 'Brașov',
        latitude: 45.6427,
        longitude: 25.5887,
        has_inspectors: false,
      },
    ]),
  ),
  http.post(supabaseUrl('/rest/v1/rpc/book_inspection'), () =>
    HttpResponse.json({ id: 'd1000000-0000-4000-8000-000000000099', number: 1099 }),
  ),
];
