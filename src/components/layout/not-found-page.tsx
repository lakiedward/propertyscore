import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { StatusPage } from './status-page';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <StatusPage
      title={t('pages.notFound.title')}
      description={t('pages.notFound.description')}
      action={
        <Button asChild variant="outline">
          <Link to="/">{t('actions.goHome')}</Link>
        </Button>
      }
    />
  );
}
