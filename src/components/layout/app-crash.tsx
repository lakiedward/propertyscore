import type { FallbackProps } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useErrorMessage } from '@/i18n/error-message';
import { StatusPage } from './status-page';

export function AppCrash({ error, resetErrorBoundary }: FallbackProps) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();

  return (
    <StatusPage
      title={t('pages.error.title')}
      description={errorMessage(error)}
      action={<Button onClick={resetErrorBoundary}>{t('actions.retry')}</Button>}
    />
  );
}
