import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useErrorMessage } from '@/i18n/error-message';
import { logger } from '@/lib/logger';
import { StatusPage } from './status-page';

export function RouteError({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const queryErrorBoundary = useQueryErrorResetBoundary();

  useEffect(() => {
    logger.error(error);
  }, [error]);

  const handleRetry = () => {
    queryErrorBoundary.reset();
    reset();
    void router.invalidate();
  };

  return (
    <StatusPage
      title={t('pages.error.title')}
      description={errorMessage(error)}
      action={<Button onClick={handleRetry}>{t('actions.retry')}</Button>}
    />
  );
}
