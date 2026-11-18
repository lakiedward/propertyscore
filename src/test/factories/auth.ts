import type { Session, User, UserIdentity } from '@supabase/supabase-js';
import { createAuthState, type AuthState } from '@/features/auth';

export const TEST_USER_ID = 'a0000000-0000-4000-8000-000000000001';
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

function buildIdentity(overrides: Partial<UserIdentity> = {}): UserIdentity {
  return {
    id: TEST_USER_ID,
    identity_id: 'b0000000-0000-4000-8000-000000000001',
    user_id: TEST_USER_ID,
    identity_data: { email: 'ana.ro@example.test' },
    provider: 'email',
    created_at: '2026-10-01T09:00:00.000Z',
    last_sign_in_at: '2026-10-01T09:00:00.000Z',
    updated_at: '2026-10-01T09:00:00.000Z',
    ...overrides,
  };
}

export function buildUnconfirmedSignUp(
  email: string,
  createdAt = new Date(),
  confirmationSentAt = new Date(),
): User {
  return buildUser({
    email,
    created_at: createdAt.toISOString(),
    confirmation_sent_at: confirmationSentAt.toISOString(),
    identities: [buildIdentity({ identity_data: { email } })],
  });
}

type AccessTokenClaims = {
  user_roles?: readonly string[];
  amr?: readonly { method: string; timestamp: number }[];
};

function toBase64Url(value: object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}

export function buildAccessToken({
  user_roles = ['user'],
  amr = [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) }],
}: AccessTokenClaims = {}): string {
  const header = toBase64Url({ alg: 'HS256', typ: 'JWT' });
  const payload = toBase64Url({ sub: TEST_USER_ID, role: 'authenticated', user_roles, amr });
  return `${header}.${payload}.test-signature`;
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

export const signedOut: AuthState = createAuthState(null);

export function signedInAs(...roles: AuthState['roles']): AuthState {
  return createAuthState(buildSession(), roles);
}
