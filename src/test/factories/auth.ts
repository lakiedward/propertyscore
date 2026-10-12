import type { Session, User } from '@supabase/supabase-js';
import type { AuthState } from '@/features/auth';

const TEST_USER_ID = 'a0000000-0000-4000-8000-000000000001';
const SESSION_LIFETIME_SECONDS = 3600;

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: TEST_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'ana.ro@example.test',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { locale: 'ro' },
    created_at: '2026-10-01T09:00:00.000Z',
    ...overrides,
  };
}

export function buildSession(overrides: Partial<Session> = {}): Session {
  const user = overrides.user ?? buildUser();
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    token_type: 'bearer',
    expires_in: SESSION_LIFETIME_SECONDS,
    expires_at: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
    ...overrides,
    user,
  };
}

export const signedOut: AuthState = { session: null, user: null };
