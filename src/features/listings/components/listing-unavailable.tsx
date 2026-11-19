import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { StatusPage } from '@/components/layout/status-page';
import { Button } from '@/components/ui/button';

export function ListingUnavailable() {
  const { t } = useTranslation('listings');

  return (
    <StatusPage
      title={t('detail.unavailable.title')}
      description={t('detail.unavailable.description')}
      action={
        <Button asChild>
          <Link to="/listings">{t('detail.unavailable.action')}</Link>
        </Button>
      }
    />
  );
}
