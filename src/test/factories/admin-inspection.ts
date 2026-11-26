import type { AdminInspection } from '@/features/inspections';
import { bucharestDaysFromToday } from '@/test/bucharest-date';

let sequence = 0;

export function buildAdminInspection(overrides: Partial<AdminInspection> = {}): AdminInspection {
  sequence += 1;
  const suffix = String(sequence).padStart(12, '0');
  const startsAt = bucharestDaysFromToday(3, 14);
  const endsAt = bucharestDaysFromToday(3, 16);
  return {
    id: `d3000000-0000-4000-8000-${suffix}`,
    number: 1200 + sequence,
    status: 'scheduled',
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    address_text: 'Calea Circumvalațiunii 41',
    city_id: 'c4000000-0000-4000-8000-000000000001',
    city_name: 'Timișoara',
    property_type: 'apartment',
    area_m2: 60,
    floor: 6,
    building_floors: 10,
    access_mode: 'self',
    access_name: 'Ion Țurcanu',
    access_phone: '+40722000003',
    access_tags: [],
    access_notes: null,
    client_name: 'Ion Țurcanu',
    client_phone: '+40722000003',
    inspector_id: null,
    inspector_name: null,
    price: 500,
    currency: 'RON',
    payment_status: 'unpaid',
    created_at: '2026-11-18T09:00:00.000Z',
    ...overrides,
  };
}
