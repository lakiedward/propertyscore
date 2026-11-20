import type { StaffUser } from '@/features/staff';

let sequence = 0;

export function buildStaffUser(overrides: Partial<StaffUser> = {}): StaffUser {
  sequence += 1;
  const suffix = String(sequence).padStart(12, '0');
  return {
    user_id: `e1000000-0000-4000-8000-${suffix}`,
    full_name: 'Andreea Popescu',
    email: `user${String(sequence)}@example.test`,
    phone: '+40722123456',
    roles: ['user'],
    inspector_city_id: null,
    inspector_city_name: null,
    is_blocked: false,
    created_at: '2026-10-02T09:00:00.000Z',
    total_count: 1,
    ...overrides,
  };
}
