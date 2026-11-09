export type AppErrorCode =
  'unauthenticated' | 'forbidden' | 'not_found' | 'conflict' | 'validation' | 'network' | 'unknown';

export type AppErrorReason =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'user_already_exists'
  | 'weak_password'
  | 'same_password'
  | 'captcha_failed'
  | 'rate_limited'
  | 'current_password_invalid'
  | 'current_password_required'
  | 'reauthentication_needed'
  | 'link_expired'
  | 'invalid_password'
  | 'email_mismatch'
  | 'last_admin'
  | 'listing_not_found'
  | 'listing_already_pending'
  | 'listing_blocked'
  | 'listing_invalid_transition'
  | 'listing_incomplete'
  | 'listing_not_pending'
  | 'listing_photo_limit'
  | 'listing_photos_changed'
  | 'decision_reason_invalid'
  | 'decision_message_required'
  | 'decision_message_too_long'
  | 'listing_floor_above_building'
  | 'value_out_of_range';

type AppErrorOptions = {
  cause?: unknown;
  field?: string;
  reason?: AppErrorReason;
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly field: string | undefined;
  readonly reason: AppErrorReason | undefined;

  constructor(code: AppErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.field = options.field;
    this.reason = options.reason;
  }
}

const EXPECTED_CODES: readonly AppErrorCode[] = [
  'unauthenticated',
  'forbidden',
  'not_found',
  'conflict',
  'validation',
];

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isExpectedError(error: unknown): boolean {
  return isAppError(error) && EXPECTED_CODES.includes(error.code);
}
