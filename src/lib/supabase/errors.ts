import { isAuthError } from '@supabase/supabase-js';
import { AppError, isAppError, type AppErrorCode, type AppErrorReason } from '@/lib/errors';

const POSTGREST_CODES: Readonly<Record<string, AppErrorCode>> = {
  PGRST116: 'not_found',
  PGRST301: 'unauthenticated',
  PGRST303: 'unauthenticated',
  '23505': 'conflict',
  '23503': 'conflict',
  '42501': 'forbidden',
  '23502': 'validation',
  '23514': 'validation',
  '22P02': 'validation',
  P0001: 'validation',
};

export const EXPIRED_LINK_CODES: readonly string[] = [
  'otp_expired',
  'flow_state_expired',
  'flow_state_not_found',
];

const AUTH_REASONS: Readonly<Record<string, AppErrorReason>> = {
  ...Object.fromEntries(EXPIRED_LINK_CODES.map((code) => [code, 'link_expired' as const])),
  invalid_credentials: 'invalid_credentials',
  email_not_confirmed: 'email_not_confirmed',
  user_already_exists: 'user_already_exists',
  email_exists: 'user_already_exists',
  weak_password: 'weak_password',
  same_password: 'same_password',
  captcha_failed: 'captcha_failed',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
  current_password_invalid: 'current_password_invalid',
  current_password_required: 'current_password_required',
  reauthentication_needed: 'reauthentication_needed',
};

const AUTH_FIELDS: Readonly<Partial<Record<AppErrorReason, string>>> = {
  user_already_exists: 'email',
  weak_password: 'password',
  same_password: 'password',
  current_password_invalid: 'currentPassword',
  current_password_required: 'currentPassword',
};

const RPC_REASONS: Readonly<Record<string, AppErrorReason>> = {
  invalid_password: 'invalid_password',
  email_mismatch: 'email_mismatch',
  last_admin: 'last_admin',
  rate_limited: 'rate_limited',
  reauthentication_needed: 'reauthentication_needed',
};

const RPC_FIELDS: Readonly<Partial<Record<AppErrorReason, string>>> = {
  invalid_password: 'confirmation',
  email_mismatch: 'confirmation',
};

const AUTH_UNAUTHENTICATED = new Set([
  'session_not_found',
  'session_expired',
  'refresh_token_not_found',
  'refresh_token_already_used',
  'bad_jwt',
  'no_authorization',
]);

type PostgrestLikeError = {
  code: string;
  message: string;
  details: unknown;
};

function isPostgrestLikeError(error: unknown): error is PostgrestLikeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string' &&
    'details' in error
  );
}

function isNetworkFailure(message: string): boolean {
  return /failed to fetch|network ?error|load failed|fetch failed/i.test(message);
}

function fromAuthError(error: {
  code?: string | undefined;
  status?: number | undefined;
  message: string;
}) {
  const code = error.code ?? '';
  const reason = AUTH_REASONS[code];
  if (reason) {
    const appCode: AppErrorCode = reason === 'rate_limited' ? 'unknown' : 'validation';
    return new AppError(appCode, error.message, {
      cause: error,
      reason,
      field: AUTH_FIELDS[reason],
    });
  }
  if (AUTH_UNAUTHENTICATED.has(code) || error.status === 401) {
    return new AppError('unauthenticated', error.message, { cause: error });
  }
  if (error.status === 0 || isNetworkFailure(error.message)) {
    return new AppError('network', error.message, { cause: error });
  }
  if (error.status === 403) {
    return new AppError('forbidden', error.message, { cause: error });
  }
  return new AppError('unknown', error.message, { cause: error });
}

function fromPostgrestError(error: PostgrestLikeError) {
  const reason = error.code === 'P0001' ? RPC_REASONS[error.message] : undefined;
  if (reason) {
    return new AppError('validation', error.message, {
      cause: error,
      reason,
      field: RPC_FIELDS[reason],
    });
  }
  const code = POSTGREST_CODES[error.code];
  if (code) {
    return new AppError(code, error.message, { cause: error });
  }
  if (isNetworkFailure(error.message)) {
    return new AppError('network', error.message, { cause: error });
  }
  return new AppError('unknown', error.message, { cause: error });
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  if (isAuthError(error)) {
    return fromAuthError(error);
  }
  if (isPostgrestLikeError(error)) {
    return fromPostgrestError(error);
  }
  if (error instanceof Error) {
    const code: AppErrorCode = isNetworkFailure(error.message) ? 'network' : 'unknown';
    return new AppError(code, error.message, { cause: error });
  }
  return new AppError('unknown', 'Unknown error', { cause: error });
}
