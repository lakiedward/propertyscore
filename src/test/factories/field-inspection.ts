import type { WorkspaceInspection } from '@/features/field-inspection';

export function buildWorkspaceInspection(
  overrides: Partial<WorkspaceInspection> = {},
): WorkspaceInspection {
  return {
    id: 'd2000000-0000-4000-8000-000000000001',
    number: 1042,
    status: 'inspector_assigned',
    starts_at: '2026-11-24T07:30:00.000Z',
    ends_at: '2026-11-24T09:30:00.000Z',
    started_at: null,
    submitted_at: null,
    score: null,
    form_version_id: null,
    consent_version_id: null,
    address_text: 'Str. Gheorghe Lazăr 12, ap. 7',
    city_name: 'Timișoara',
    property_type: 'apartment',
    area_m2: 84,
    floor: 2,
    building_floors: 4,
    year_built: 1962,
    access_name: 'D. Popescu',
    access_phone: '+40722318904',
    inspector_name: 'Ana Marin',
    ...overrides,
  };
}
