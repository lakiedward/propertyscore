import type { AgendaInspection } from '@/features/inspections';

let sequence = 0;

export function buildAgendaInspection(overrides: Partial<AgendaInspection> = {}): AgendaInspection {
  sequence += 1;
  const suffix = String(sequence).padStart(12, '0');
  return {
    id: `d1000000-0000-4000-8000-${suffix}`,
    number: 1000 + sequence,
    status: 'inspector_assigned',
    starts_at: '2026-11-24T07:30:00.000Z',
    ends_at: '2026-11-24T09:30:00.000Z',
    address_text: 'Str. Școlii 12',
    city_name: 'Timișoara',
    latitude: 45.75,
    longitude: 21.22,
    property_type: 'apartment',
    area_m2: 78,
    floor: 3,
    building_floors: 8,
    year_built: 1978,
    access_name: 'Ana Mărginean',
    access_phone: '+40722000001',
    access_tags: ['intercom'],
    access_notes: 'Câinele stă pe balcon.',
    answered_count: 0,
    question_count: 44,
    submitted_at: null,
    ...overrides,
  };
}
