import { CalendarClockIcon, CalendarXIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { StageTimeline, type Stage } from '@/components/feedback/stage-timeline';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatDate } from '@/i18n/format';
import { useCancelInspection } from '../api/inspections.queries';
import { useBookingText } from '../hooks/use-booking-text';
import type { AppointmentMode, MyInspection } from '../inspection.types';
import { canChangeAppointment, knownAccessTags } from '../inspection.utils';
import { InspectionHistory } from './inspection-history';
import { InspectionStatusPill } from './inspection-status-pill';
import { RescheduleSection } from './reschedule-section';

type AppointmentDrawerProps = {
  appointment: MyInspection;
  mode: AppointmentMode | undefined;
  now: Date;
  onModeChange: (mode: AppointmentMode) => void;
  onClose: () => void;
};

export function AppointmentDrawer({
  appointment,
  mode,
  now,
  onModeChange,
  onClose,
}: AppointmentDrawerProps) {
  const { t } = useTranslation('inspections');
  const canChange = canChangeAppointment(appointment, now);
  const isRescheduling = mode === 'reschedule' && canChange;

  return (
    <Sheet
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-110">
        <SheetHeader className="border-b border-border-subtle px-5 py-4">
          <SheetTitle className="text-h4 first-letter:uppercase">
            {t('appointments.drawer.title', {
              date: formatDate(appointment.starts_at, { day: 'numeric', month: 'short' }),
            })}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t('appointments.drawer.description')}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4.5 p-5">
          {isRescheduling ? (
            <RescheduleSection
              inspectionId={appointment.id}
              cityId={appointment.city_id}
              cityName={appointment.city_name}
              inspectorName={appointment.inspector_name}
              onDone={() => {
                onModeChange('details');
              }}
            />
          ) : (
            <Details
              appointment={appointment}
              canChange={canChange}
              onReschedule={() => {
                onModeChange('reschedule');
              }}
              onCancelled={onClose}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

type DetailRowKey = 'date' | 'address' | 'inspector' | 'opener' | 'phone' | 'notes';

type DetailsProps = {
  appointment: MyInspection;
  canChange: boolean;
  onReschedule: () => void;
  onCancelled: () => void;
};

function Details({ appointment, canChange, onReschedule, onCancelled }: DetailsProps) {
  const { t } = useTranslation('inspections');
  const text = useBookingText();
  const cancel = useCancelInspection();
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const dateText = text.date(appointment.starts_at);
  const notes = [
    ...knownAccessTags(appointment.access_tags).map((tag) => t(`accessTag.${tag}`)),
    ...(appointment.access_notes ? [appointment.access_notes] : []),
  ].join('. ');
  const allRows: { key: DetailRowKey; value: string }[] = [
    { key: 'date', value: dateText },
    { key: 'address', value: text.addressLine(appointment.address_text, appointment.city_name) },
    {
      key: 'inspector',
      value: appointment.inspector_name ?? t('appointments.inspectorPending'),
    },
    { key: 'opener', value: appointment.access_name ?? '' },
    { key: 'phone', value: appointment.access_phone ?? '' },
    { key: 'notes', value: notes },
  ];
  const rows = allRows.filter((row) => row.value !== '');
  const isCancelled = appointment.status === 'cancelled';
  const isAssigned = appointment.inspector_name !== null;
  const isDone = appointment.status === 'completed' || appointment.status === 'book_ready';
  const stages: Stage[] = [
    {
      id: 'booked',
      label: t('appointments.stages.booked'),
      meta: formatDate(appointment.created_at),
      state: 'done',
    },
    isCancelled
      ? {
          id: 'cancelled',
          label: t('appointments.stages.cancelled'),
          meta: appointment.cancelled_at ? formatDate(appointment.cancelled_at) : undefined,
          state: 'cancelled',
        }
      : {
          id: 'assigned',
          label: t('appointments.stages.assigned'),
          meta: appointment.inspector_name ?? t('appointments.stages.inProgress'),
          state: isAssigned || isDone ? 'done' : 'current',
        },
    {
      id: 'visit',
      label: t('appointments.stages.visit'),
      meta: dateText,
      state: isCancelled ? 'cancelled' : isDone ? 'done' : isAssigned ? 'current' : 'upcoming',
    },
    {
      id: 'review',
      label: t('appointments.stages.review'),
      meta: t('appointments.stages.reviewMeta'),
      state:
        appointment.status === 'book_ready'
          ? 'done'
          : appointment.status === 'completed'
            ? 'current'
            : 'upcoming',
    },
    {
      id: 'book',
      label: t('appointments.stages.book'),
      meta: t('booking.confirmation.stages.bookMeta'),
      state: appointment.status === 'book_ready' ? 'done' : 'upcoming',
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span className="font-mono text-small text-muted-foreground">
          {t('appointments.number', { number: appointment.number })}
        </span>
        <InspectionStatusPill status={appointment.status} audience="client" />
      </div>
      <dl className="flex flex-col">
        {rows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 border-b border-border-subtle py-2.5 text-body-sm"
          >
            <dt className="text-muted-foreground">{t(`appointments.rows.${row.key}`)}</dt>
            <dd className="font-semibold first-letter:uppercase">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2.5">
        <strong className="text-h4">{t('appointments.stages.title')}</strong>
        <StageTimeline
          label={t('appointments.stages.label')}
          stages={stages}
          orientation="vertical"
        />
      </div>
      <InspectionHistory inspectionId={appointment.id} />
      {canChange ? (
        <div className="flex flex-wrap gap-2.5 border-t border-border-subtle pt-4">
          <Button type="button" variant="secondary" onClick={onReschedule}>
            <CalendarClockIcon aria-hidden />
            {t('appointments.reschedule.open')}
          </Button>
          <ConfirmDialog
            isOpen={isCancelOpen}
            onOpenChange={setIsCancelOpen}
            tone="destructive"
            title={t('appointments.cancel.title', { date: dateText })}
            description={t('appointments.cancel.text')}
            confirmLabel={t('appointments.cancel.confirm')}
            pendingLabel={t('appointments.cancel.pending')}
            cancelLabel={t('appointments.cancel.keep')}
            confirmIcon={CalendarXIcon}
            isPending={cancel.isPending}
            onConfirm={() => {
              cancel.mutate(appointment.id, {
                onSuccess: () => {
                  toast.success(t('appointments.cancel.done'));
                  setIsCancelOpen(false);
                  onCancelled();
                },
              });
            }}
            trigger={
              <Button type="button" variant="destructive">
                <CalendarXIcon aria-hidden />
                {t('appointments.cancel.open')}
              </Button>
            }
          />
        </div>
      ) : isDone ? (
        <span className="text-small text-muted-foreground">{t('appointments.locked')}</span>
      ) : null}
    </>
  );
}
