export type AppErrorCode =
  'unauthenticated' | 'forbidden' | 'not_found' | 'conflict' | 'validation' | 'network' | 'unknown';

export type AppErrorReason =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'user_already_exists'
  | 'weak_password'
  | 'rate_limited';

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
