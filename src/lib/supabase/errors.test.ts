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

  it.each([
    ['invalid_password', 'confirmation'],
    ['email_mismatch', 'confirmation'],
    ['last_admin', undefined],
    ['rate_limited', undefined],
    ['reauthentication_needed', undefined],
    ['listing_photos_changed', undefined],
  ])('maps the function error %s to its reason and the %s field', (message, field) => {
    const error = toAppError(postgrestError('P0001', message));

    expect(error.code).toBe('validation');
    expect(error.reason).toBe(message);
    expect(error.field).toBe(field);
  });

  it.each([
    ['listings_floor_within_building', 'listing_floor_above_building', 'floor'],
    ['listings_price_check', 'value_out_of_range', 'price'],
    ['listings_year_built_check', 'value_out_of_range', 'year_built'],
    ['listings_latitude_check', 'value_out_of_range', 'pin'],
  ])('maps the refused rule %s to the %s reason on the %s field', (constraint, reason, field) => {
    const error = toAppError(
      postgrestError(
        '23514',
        `new row for relation "listings" violates check constraint "${constraint}"`,
      ),
    );

    expect(error.code).toBe('validation');
    expect(error.reason).toBe(reason);
    expect(error.field).toBe(field);
  });

  it('keeps a refused rule it cannot place on a field generic', () => {
    const error = toAppError(
      postgrestError('23514', 'new row for relation "x" violates check constraint "x_rule"'),
    );

    expect(error.code).toBe('validation');
    expect(error.reason).toBeUndefined();
  });

  it('maps a function outcome returned as data like a function error', () => {
    const error = toAppError({ code: 'P0001', message: 'invalid_password', details: null });

    expect(error.code).toBe('validation');
    expect(error.reason).toBe('invalid_password');
    expect(error.field).toBe('confirmation');
  });

  it('keeps an unknown function error without a reason', () => {
    expect(toAppError(postgrestError('P0001', 'report_not_found')).reason).toBe(undefined);
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
    ['same_password', 'same_password'],
    ['captcha_failed', 'captcha_failed'],
    ['over_request_rate_limit', 'rate_limited'],
    ['over_email_send_rate_limit', 'rate_limited'],
    ['otp_expired', 'link_expired'],
    ['flow_state_expired', 'link_expired'],
    ['flow_state_not_found', 'link_expired'],
    ['current_password_invalid', 'current_password_invalid'],
    ['current_password_required', 'current_password_required'],
    ['reauthentication_needed', 'reauthentication_needed'],
  ])('maps the auth code %s to the reason %s', (code, reason) => {
    expect(toAppError(new AuthApiError('auth failed', 400, code)).reason).toBe(reason);
  });

  it.each([
    ['over_request_rate_limit', 'unknown'],
    ['over_email_send_rate_limit', 'unknown'],
    ['captcha_failed', 'validation'],
    ['otp_expired', 'validation'],
    ['flow_state_expired', 'validation'],
    ['flow_state_not_found', 'validation'],
  ])('gives the auth code %s the %s code', (code, expected) => {
    const error = toAppError(new AuthApiError('auth failed', 400, code));

    expect(error.code).toBe(expected);
    expect(error.field).toBe(undefined);
  });

  it.each([
    ['user_already_exists', 'email'],
    ['email_exists', 'email'],
    ['weak_password', 'password'],
    ['same_password', 'password'],
    ['current_password_invalid', 'currentPassword'],
    ['current_password_required', 'currentPassword'],
  ])('ties the auth code %s to the %s field', (code, field) => {
    expect(toAppError(new AuthApiError('auth failed', 422, code)).field).toBe(field);
  });

  it('leaves sign-in failures without a field', () => {
    expect(toAppError(new AuthApiError('auth failed', 400, 'invalid_credentials')).field).toBe(
      undefined,
    );
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
