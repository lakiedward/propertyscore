import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/i18n/format';
import { inspectionQueries } from '../api/inspections.queries';

type InspectionHistoryProps = {
  inspectionId: string;
};

export function InspectionHistory({ inspectionId }: InspectionHistoryProps) {
  const { t } = useTranslation('inspections');
  const history = useQuery(inspectionQueries.history(inspectionId));

  return (
    <div className="flex flex-col gap-2">
      <strong className="text-h4">{t('appointments.history.title')}</strong>
      {history.isPending ? (
        <Skeleton className="h-16" />
      ) : (
        <ol className="flex flex-col gap-1.5">
          {(history.data ?? []).map((event) => (
            <li key={`${event.kind}-${event.created_at}`} className="flex flex-col text-small">
              <strong>{t(`appointments.history.kind.${event.kind}`)}</strong>
              <span className="text-muted-foreground">
                {event.actor_name
                  ? t('appointments.history.meta', {
                      date: formatDateTime(event.created_at),
                      name: event.actor_name,
                    })
                  : formatDateTime(event.created_at)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
