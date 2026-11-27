import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';

export function CurrentInspectionEmpty() {
  const { t } = useTranslation('fieldInspection');

  return (
    <EmptyState
      title={t('current.emptyTitle')}
      description={t('current.emptyText')}
      action={
        <Button asChild>
          <Link to="/field" search={{ day: 'today' }}>
            {t('current.toAgenda')}
          </Link>
        </Button>
      }
    />
  );
}
