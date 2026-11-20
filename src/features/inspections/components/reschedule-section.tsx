import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useErrorMessage } from '@/i18n/error-message';
import { AppError } from '@/lib/errors';
import { useRescheduleInspection } from '../api/inspections.queries';
import { InspectionDatePicker } from './inspection-date-picker';

type RescheduleSectionProps = {
  inspectionId: string;
  cityId: string;
  cityName: string;
  inspectorName: string | null;
  onDone: () => void;
};

export function RescheduleSection({
  inspectionId,
  cityId,
  cityName,
  inspectorName,
  onDone,
}: RescheduleSectionProps) {
  const { t } = useTranslation('inspections');
  const errorMessage = useErrorMessage();
  const reschedule = useRescheduleInspection();
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [isTaken, setIsTaken] = useState(false);
  const isTakenError =
    reschedule.error instanceof AppError && reschedule.error.reason === 'slot_taken';

  return (
    <>
      <div className="flex flex-col gap-1">
        <strong className="text-h4">{t('appointments.reschedule.title')}</strong>
        <span className="text-small text-muted-foreground">
          {inspectorName
            ? t('appointments.reschedule.textAssigned', { name: inspectorName })
            : t('appointments.reschedule.text')}
        </span>
      </div>
      <InspectionDatePicker
        cityId={cityId}
        cityName={cityName}
        startsAt={startsAt}
        isStartTaken={isTaken}
        onPick={(value) => {
          setStartsAt(value);
          setIsTaken(false);
        }}
      />
      {reschedule.isError && !isTakenError ? (
        <Alert tone="error">
          <AlertDescription>{errorMessage(reschedule.error)}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2.5">
        <Button type="button" variant="ghost" onClick={onDone}>
          {t('appointments.reschedule.back')}
        </Button>
        <Button
          type="button"
          disabled={!startsAt || reschedule.isPending}
          aria-busy={reschedule.isPending}
          onClick={() => {
            if (!startsAt) {
              return;
            }
            reschedule.mutate(
              { inspectionId, startsAt },
              {
                onSuccess: () => {
                  toast.success(t('appointments.reschedule.done'));
                  onDone();
                },
                onError: (error) => {
                  if (error instanceof AppError && error.reason === 'slot_taken') {
                    setStartsAt(null);
                    setIsTaken(true);
                  }
                },
              },
            );
          }}
        >
          {reschedule.isPending
            ? t('appointments.reschedule.pending')
            : t('appointments.reschedule.confirm')}
        </Button>
      </div>
    </>
  );
}
