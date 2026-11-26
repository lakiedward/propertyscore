import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClockIcon, CalendarXIcon, UserMinusIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { SearchSelect } from '@/components/forms/search-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { useErrorMessage } from '@/i18n/error-message';
import { formatDate, formatPrice, toCurrency } from '@/i18n/format';
import { useValidationMessage } from '@/i18n/validation';
import {
  useAssignInspector,
  useCancelInspectionAsAdmin,
  useUnassignInspector,
} from '../../api/inspections.queries';
import {
  CANCEL_REASON_MAX,
  cancelReasonSchema,
  type CancelReasonValues,
} from '../../booking.schemas';
import { useBookingText } from '../../hooks/use-booking-text';
import { useFreeInspectors } from '../../hooks/use-free-inspectors';
import type { AdminInspection, AppointmentMode } from '../../inspection.types';
import { AppointmentSheet } from '../appointment-sheet';
import { InspectionHistory } from '../inspection-history';
import { InspectionStatusPill } from '../inspection-status-pill';
import { RescheduleSection } from '../reschedule-section';
import { inspectorOption } from './inspector-option';

type RowKey = 'date' | 'address' | 'client' | 'opener' | 'notes' | 'payment';

type AdminAppointmentDrawerProps = {
  inspection: AdminInspection;
  mode: AppointmentMode | undefined;
  onModeChange: (mode: AppointmentMode | undefined) => void;
  onClose: () => void;
};

export function AdminAppointmentDrawer({
  inspection,
  mode,
  onModeChange,
  onClose,
}: AdminAppointmentDrawerProps) {
  const { t } = useTranslation('inspections');
  const isOpenForChanges =
    inspection.status === 'scheduled' || inspection.status === 'inspector_assigned';

  return (
    <AppointmentSheet
      title={t('appointments.drawer.title', {
        date: formatDate(inspection.starts_at, { day: 'numeric', month: 'short' }),
      })}
      description={t('schedule.drawer.description')}
      onClose={onClose}
      className="data-[side=right]:w-full data-[side=right]:sm:max-w-160"
    >
      {mode === 'reschedule' && isOpenForChanges ? (
        <RescheduleSection
          inspectionId={inspection.id}
          cityId={inspection.city_id}
          cityName={inspection.city_name}
          inspectorName={inspection.inspector_name}
          onDone={() => {
            onModeChange(undefined);
          }}
        />
      ) : (
        <Details
          inspection={inspection}
          isOpenForChanges={isOpenForChanges}
          onReschedule={() => {
            onModeChange('reschedule');
          }}
          onCancelled={onClose}
        />
      )}
    </AppointmentSheet>
  );
}

type DetailsProps = {
  inspection: AdminInspection;
  isOpenForChanges: boolean;
  onReschedule: () => void;
  onCancelled: () => void;
};

function Details({ inspection, isOpenForChanges, onReschedule, onCancelled }: DetailsProps) {
  const { t } = useTranslation('inspections');
  const text = useBookingText();
  const bookingTitleId = useId();
  const notes = text.accessNotes(inspection.access_tags, inspection.access_notes);
  const facts = text.factLine({
    propertyType: inspection.property_type,
    areaM2: inspection.area_m2,
    floor: inspection.floor,
    buildingFloors: inspection.building_floors,
  });
  const rows: { key: RowKey; value: string; sub?: string }[] = [
    { key: 'date', value: text.date(inspection.starts_at) },
    {
      key: 'address',
      value: text.addressLine(inspection.address_text, inspection.city_name),
      sub: facts,
    },
    {
      key: 'client',
      value: inspection.client_name ?? '',
      sub: inspection.client_phone ?? undefined,
    },
    {
      key: 'opener',
      value: inspection.access_name ?? '',
      sub: inspection.access_phone ?? undefined,
    },
    { key: 'notes', value: notes },
    {
      key: 'payment',
      value: t(`schedule.payment.${inspection.payment_status}`, {
        price: formatPrice(inspection.price, toCurrency(inspection.currency)),
      }),
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between gap-2.5">
        <span className="font-mono text-small text-muted-foreground">
          {t('appointments.number', { number: inspection.number })}
        </span>
        <InspectionStatusPill status={inspection.status} audience="client" />
      </div>
      <dl className="flex flex-col">
        {rows
          .filter((row) => row.value !== '')
          .map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-t border-border-subtle py-2.5 text-small"
            >
              <dt className="text-muted-foreground">{t(`schedule.drawer.rows.${row.key}`)}</dt>
              <dd className="flex flex-col gap-0.5">
                <strong className="first-letter:uppercase">{row.value}</strong>
                {row.sub ? <span className="text-muted-foreground">{row.sub}</span> : null}
              </dd>
            </div>
          ))}
      </dl>
      {isOpenForChanges ? (
        <>
          <AssignInspector key={inspection.inspector_id} inspection={inspection} />
          <section
            aria-labelledby={bookingTitleId}
            className="flex flex-col gap-3 rounded-lg border border-card bg-card p-4 shadow-card-soft"
          >
            <h3 id={bookingTitleId} className="text-body-sm font-bold">
              {t('schedule.drawer.booking')}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                className="touch-target"
                onClick={onReschedule}
              >
                <CalendarClockIcon aria-hidden />
                {t('appointments.reschedule.open')}
              </Button>
              <CancelDialog inspection={inspection} onCancelled={onCancelled} />
            </div>
          </section>
        </>
      ) : null}
      <InspectionHistory inspectionId={inspection.id} />
    </>
  );
}

type AssignInspectorProps = {
  inspection: AdminInspection;
};

function AssignInspector({ inspection }: AssignInspectorProps) {
  const { t } = useTranslation('inspections');
  const errorMessage = useErrorMessage();
  const selectId = useId();
  const titleId = useId();
  const inspectors = useFreeInspectors(inspection);
  const assign = useAssignInspector();
  const unassign = useUnassignInspector();
  const [inspectorId, setInspectorId] = useState(inspection.inspector_id ?? '');
  const isChange = inspection.inspector_id !== null;

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-lg border border-card bg-card p-4 shadow-card-soft"
    >
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h3 id={titleId} className="text-body-sm font-bold">
          <label htmlFor={selectId}>{t('schedule.drawer.inspector')}</label>
        </h3>
        {isChange ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="touch-target text-muted-foreground"
            disabled={unassign.isPending}
            onClick={() => {
              unassign.mutate(inspection.id, {
                onSuccess: () => {
                  setInspectorId('');
                },
              });
            }}
          >
            <UserMinusIcon aria-hidden />
            {t('schedule.drawer.unassign')}
          </Button>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchSelect
          id={selectId}
          value={inspectorId === '' ? null : inspectorId}
          options={inspectors.free.map((inspector) =>
            inspectorOption(inspector, inspector.city_name),
          )}
          onChange={setInspectorId}
          placeholder={t('schedule.drawer.choose')}
          searchPlaceholder={t('schedule.availability.search')}
          emptyText={
            inspectors.free.length === 0 && !inspectors.isLoading
              ? t('schedule.drawer.noFree')
              : t('schedule.availability.noMatch')
          }
          className="flex-1"
        />
        <Button
          type="button"
          size="md"
          className="touch-target sm:min-w-28"
          disabled={
            inspectorId === '' || inspectorId === inspection.inspector_id || assign.isPending
          }
          onClick={() => {
            assign.mutate(
              { inspectionId: inspection.id, inspectorId },
              {
                onSuccess: () => {
                  toast.success(t('schedule.drawer.assignedToast'));
                },
              },
            );
          }}
        >
          {isChange ? t('schedule.drawer.change') : t('schedule.drawer.assign')}
        </Button>
      </div>
      <p className="text-caption text-muted-foreground">{t('schedule.drawer.freeOnly')}</p>
      {assign.isError ? (
        <Alert tone="error">
          <AlertDescription>{errorMessage(assign.error)}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}

type CancelDialogProps = {
  inspection: AdminInspection;
  onCancelled: () => void;
};

function CancelDialog({ inspection, onCancelled }: CancelDialogProps) {
  const { t } = useTranslation('inspections');
  const validationMessage = useValidationMessage();
  const formId = useId();
  const reasonId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const cancel = useCancelInspectionAsAdmin();
  const form = useForm<CancelReasonValues>({
    resolver: zodResolver(cancelReasonSchema),
    defaultValues: { reason: '' },
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  };

  const handleSubmit = form.handleSubmit((values) => {
    cancel.mutate(
      { inspectionId: inspection.id, reason: values.reason },
      {
        onSuccess: () => {
          toast.success(t('appointments.cancel.done'));
          setIsOpen(false);
          onCancelled();
        },
      },
    );
  });

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      tone="destructive"
      title={t('schedule.cancel.title', { number: inspection.number })}
      description={t('schedule.cancel.text')}
      confirmLabel={t('appointments.cancel.confirm')}
      pendingLabel={t('appointments.cancel.pending')}
      cancelLabel={t('schedule.cancel.back')}
      confirmIcon={CalendarXIcon}
      isPending={cancel.isPending}
      formId={formId}
      trigger={
        <Button type="button" variant="outlineDestructive" size="md" className="touch-target">
          <CalendarXIcon aria-hidden />
          {t('schedule.drawer.cancel')}
        </Button>
      }
    >
      <form id={formId} onSubmit={(event) => void handleSubmit(event)} noValidate>
        <Controller
          name="reason"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={reasonId}>{t('schedule.cancel.reason')}</FieldLabel>
              <Textarea
                {...field}
                id={reasonId}
                maxLength={CANCEL_REASON_MAX}
                aria-invalid={fieldState.invalid}
              />
              <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
            </Field>
          )}
        />
      </form>
    </ConfirmDialog>
  );
}
