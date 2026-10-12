import * as Sentry from '@sentry/react';
import { env } from '@/config/env';
import { isExpectedError } from './errors';

type LogContext = Record<string, unknown>;

const logsToConsole = env.VITE_APP_ENV === 'local';

export const logger = {
  debug(message: string, context?: LogContext) {
    if (logsToConsole) {
      console.debug(message, context ?? '');
    }
  },
  info(message: string, context?: LogContext) {
    if (logsToConsole) {
      console.info(message, context ?? '');
    }
  },
  warn(message: string, context?: LogContext) {
    if (logsToConsole) {
      console.warn(message, context ?? '');
    }
    Sentry.addBreadcrumb({ level: 'warning', message, ...(context ? { data: context } : {}) });
  },
  error(error: unknown, context?: LogContext) {
    if (isExpectedError(error)) {
      return;
    }
    if (logsToConsole) {
      console.error(error, context ?? '');
    }
    Sentry.captureException(error, context ? { extra: context } : undefined);
  },
  setUser(userId: string | null) {
    Sentry.setUser(userId ? { id: userId } : null);
  },
  setTag(key: string, value: string) {
    Sentry.setTag(key, value);
  },
};
