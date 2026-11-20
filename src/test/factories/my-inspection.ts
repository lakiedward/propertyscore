import type { MyInspection } from '@/features/inspections';

let sequence = 0;

export function buildMyInspection(overrides: Partial<MyInspection> = {}): MyInspection {
  sequence += 1;
  const suffix = String(sequence).padStart(12, '0');
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 5);
  startsAt.setHours(11, 0, 0, 0);
  const endsAt = new Date(startsAt);
  endsAt.setHours(13);
  return {
    id: `d2000000-0000-4000-8000-${suffix}`,
    number: 1100 + sequence,
    status: 'scheduled',
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    address_text: 'Str. Paris 3, ap. 9',
    city_name: 'Timișoara',
    city_id: 'c4000000-0000-4000-8000-000000000001',
    property_type: 'apartment',
    area_m2: 62,
    floor: 2,
    building_floors: 4,
    access_mode: 'self',
    access_name: 'Ion Țurcanu',
    access_phone: '+40722000003',
    access_tags: ['parking'],
    access_notes: null,
    inspector_name: null,
    price: 500,
    currency: 'RON',
    payment_status: 'unpaid',
    assigned_at: null,
    cancelled_at: null,
    created_at: '2026-11-18T09:00:00.000Z',
    ...overrides,
  };
}
