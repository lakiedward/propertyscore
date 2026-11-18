import type { ReactNode } from 'react';
import { useErrorMessage } from '@/i18n/error-message';
import { isAppError, type AppErrorReason } from '@/lib/errors';
import { AuthNotice } from './auth-notice';

type FormErrorNoticeProps = {
  error: unknown;
  title: string;
  fallback: string;
  reasonMessages?: Partial<Record<AppErrorReason, string>>;
  children?: ReactNode;
};

function hasSpecificMessage(error: unknown): boolean {
  return isAppError(error) && (error.reason !== undefined || error.code !== 'unknown');
}

export function FormErrorNotice({
  error,
  title,
  fallback,
  reasonMessages = {},
  children,
}: FormErrorNoticeProps) {
  const errorMessage = useErrorMessage();
  const reasonMessage =
    isAppError(error) && error.reason ? reasonMessages[error.reason] : undefined;

  return (
    <AuthNotice tone="error" title={title}>
      {reasonMessage ?? (hasSpecificMessage(error) ? errorMessage(error) : fallback)}
      {children}
    </AuthNotice>
  );
}
