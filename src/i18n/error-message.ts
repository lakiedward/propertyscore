import { useTranslation } from 'react-i18next';
import { isAppError, type AppErrorCode, type AppErrorReason } from '@/lib/errors';
import { i18n } from './i18n';

type ErrorMessageKey = `errors.${AppErrorCode}` | `errors.reasons.${AppErrorReason}`;

function errorMessageKey(error: unknown): ErrorMessageKey {
  if (!isAppError(error)) {
    return 'errors.unknown';
  }
  return error.reason ? `errors.reasons.${error.reason}` : `errors.${error.code}`;
}

export function translateError(error: unknown): string {
  return i18n.t(errorMessageKey(error));
}

export function useErrorMessage() {
  const { t } = useTranslation('common');
  return (error: unknown) => t(errorMessageKey(error));
}
