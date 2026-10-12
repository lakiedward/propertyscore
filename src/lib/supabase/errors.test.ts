import { AuthApiError } from '@supabase/supabase-js';
import { AppError } from '@/lib/errors';
import { toAppError } from './errors';

function postgrestError(code: string, message = 'database error') {
  return { code, message, details: null, hint: null };
}

describe('toAppError', () => {
  it.each([
    ['PGRST116', 'not_found'],
    ['23505', 'conflict'],
    ['23503', 'conflict'],
    ['42501', 'forbidden'],
    ['23514', 'validation'],
    ['P0001', 'validation'],
    ['PGRST301', 'unauthenticated'],
  ])('maps PostgREST code %s to %s', (code, expected) => {
    expect(toAppError(postgrestError(code)).code).toBe(expected);
  });

  it('maps an unknown PostgREST code to unknown', () => {
    expect(toAppError(postgrestError('XX000')).code).toBe('unknown');
  });

  it('maps a failed fetch to network', () => {
    expect(toAppError(postgrestError('', 'TypeError: Failed to fetch')).code).toBe('network');
    expect(toAppError(new TypeError('Failed to fetch')).code).toBe('network');
  });

  it.each([
    ['invalid_credentials', 'invalid_credentials'],
    ['email_not_confirmed', 'email_not_confirmed'],
    ['user_already_exists', 'user_already_exists'],
    ['email_exists', 'user_already_exists'],
    ['weak_password', 'weak_password'],
    ['over_request_rate_limit', 'rate_limited'],
  ])('maps the auth code %s to the reason %s', (code, reason) => {
    expect(toAppError(new AuthApiError('auth failed', 400, code)).reason).toBe(reason);
  });

  it('maps an expired auth session to unauthenticated', () => {
    expect(toAppError(new AuthApiError('expired', 403, 'session_not_found')).code).toBe(
      'unauthenticated',
    );
  });

  it('returns an AppError unchanged', () => {
    const error = new AppError('conflict', 'already exists');
    expect(toAppError(error)).toBe(error);
  });

  it('wraps anything else as unknown and keeps the cause', () => {
    const appError = toAppError('boom');
    expect(appError.code).toBe('unknown');
    expect(appError.cause).toBe('boom');
  });
});
