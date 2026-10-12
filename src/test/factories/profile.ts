import type { Tables } from '@/lib/supabase/database.types';

type ProfileRow = Pick<Tables<'profiles'>, 'id' | 'locale'>;

export function buildProfile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'a0000000-0000-4000-8000-000000000001',
    locale: 'ro',
    ...overrides,
  };
}
