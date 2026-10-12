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

const AUTH_REASONS: Readonly<Record<string, AppErrorReason>> = {
  invalid_credentials: 'invalid_credentials',
  email_not_confirmed: 'email_not_confirmed',
  user_already_exists: 'user_already_exists',
  email_exists: 'user_already_exists',
  weak_password: 'weak_password',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
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
    return new AppError(appCode, error.message, { cause: error, reason });
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
