export class WorkerError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'WorkerError';
    this.code = code;
  }
}

const DATABASE_ERROR_CODE = /^[a-z][a-z0-9_]{2,79}$/;

export function errorCode(error: unknown): string {
  if (error instanceof WorkerError) return error.code;
  if (error instanceof Error && 'code' in error && error.code === 'P0001') {
    return DATABASE_ERROR_CODE.test(error.message) ? error.message : 'database_rule';
  }
  return 'unknown';
}
