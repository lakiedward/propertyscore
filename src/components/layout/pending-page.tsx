import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';

export function PendingPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <span className="sr-only">{t('pages.loading')}</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
