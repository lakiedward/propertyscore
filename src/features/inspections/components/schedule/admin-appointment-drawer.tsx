import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { CalendarClockIcon, CalendarXIcon, UserMinusIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SearchSelect } from '@/components/forms/search-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { initialsOf } from '@/features/profile';
import { useErrorMessage } from '@/i18n/error-message';
import { formatDate, formatNumber, formatPrice, toCurrency } from '@/i18n/format';
import { useValidationMessage } from '@/i18n/validation';
import {
  inspectionQueries,
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
import type { AdminInspection, AppointmentMode } from '../../inspection.types';
import { knownAccessTags } from '../../inspection.utils';
import { InspectionHistory } from '../inspection-history';
import { InspectionStatusPill } from '../inspection-status-pill';
import { RescheduleSection } from '../reschedule-section';

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
    <Sheet
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <SheetContent
        side="right"
        className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-160"
      >
        <SheetHeader className="border-b border-border-subtle px-5 py-4">
          <SheetTitle className="text-h4 first-letter:uppercase">
            {t('appointments.drawer.title', {
              date: formatDate(inspection.starts_at, { day: 'numeric', month: 'short' }),
            })}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t('schedule.drawer.description')}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4.5 p-5">
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
        </div>
      </SheetContent>
    </Sheet>
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
  const [isCancelling, setIsCancelling] = useState(false);
  const bookingTitleId = useId();
  const notes = [
    ...knownAccessTags(inspection.access_tags).map((tag) => t(`accessTag.${tag}`)),
    ...(inspection.access_notes ? [inspection.access_notes] : []),
  ].join('. ');
  const facts = [
    t(`propertyType.${inspection.property_type}`),
    ...(inspection.area_m2 !== null
      ? [t('agenda.area', { area: formatNumber(inspection.area_m2) })]
      : []),
    ...(inspection.floor !== null && inspection.building_floors !== null
      ? [t('agenda.floor', { floor: inspection.floor, floors: inspection.building_floors })]
      : []),
  ].join(' · ');
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
          <AssignInspector inspection={inspection} />
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
              <Button
                type="button"
                variant="outline"
                size="md"
                className="touch-target border-error-border text-destructive hover:border-destructive hover:bg-error-surface hover:text-destructive"
                aria-expanded={isCancelling}
                onClick={() => {
                  setIsCancelling(true);
                }}
              >
                <CalendarXIcon aria-hidden />
                {t('schedule.drawer.cancel')}
              </Button>
            </div>
          </section>
        </>
      ) : null}
      {isCancelling ? (
        <CancelPanel
          inspection={inspection}
          onBack={() => {
            setIsCancelling(false);
          }}
          onCancelled={onCancelled}
        />
      ) : null}
      <InspectionHistory inspectionId={inspection.id} />
    </>
  );
}

function AssignInspector({ inspection }: { inspection: AdminInspection }) {
  const { t } = useTranslation('inspections');
  const errorMessage = useErrorMessage();
  const selectId = useId();
  const titleId = useId();
  const inspectors = useQuery(inspectionQueries.inspectors(inspection.city_id));
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
          options={(inspectors.data ?? [])
            .filter((inspector) => inspector.is_active)
            .map((inspector) => ({
              value: inspector.user_id,
              label: inspector.full_name ?? '',
              description: inspector.city_name,
              leading: (
                <span
                  aria-hidden
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-nav-sm font-extrabold text-primary-foreground"
                >
                  {initialsOf(inspector.full_name ?? '')}
                </span>
              ),
            }))}
          onChange={setInspectorId}
          placeholder={t('schedule.drawer.choose')}
          searchPlaceholder={t('schedule.availability.search')}
          emptyText={t('schedule.availability.noMatch')}
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
      {assign.isError ? (
        <Alert tone="error">
          <AlertDescription>{errorMessage(assign.error)}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}

type CancelPanelProps = {
  inspection: AdminInspection;
  onBack: () => void;
  onCancelled: () => void;
};

function CancelPanel({ inspection, onBack, onCancelled }: CancelPanelProps) {
  const { t } = useTranslation('inspections');
  const validationMessage = useValidationMessage();
  const reasonId = useId();
  const cancel = useCancelInspectionAsAdmin();
  const form = useForm<CancelReasonValues>({
    resolver: zodResolver(cancelReasonSchema),
    defaultValues: { reason: '' },
  });

  const handleSubmit = form.handleSubmit((values) => {
    cancel.mutate(
      { inspectionId: inspection.id, reason: values.reason },
      {
        onSuccess: () => {
          toast.success(t('appointments.cancel.done'));
          onCancelled();
        },
      },
    );
  });

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      className="flex flex-col gap-3 rounded-lg border-[1.5px] border-destructive bg-error-surface p-3.5"
    >
      <strong className="text-body-sm text-destructive">
        {t('schedule.cancel.title', { number: inspection.number })}
      </strong>
      <p className="text-small">{t('schedule.cancel.text')}</p>
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
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" className="touch-target" onClick={onBack}>
          {t('schedule.cancel.back')}
        </Button>
        <Button
          type="submit"
          variant="destructive"
          size="sm"
          className="touch-target"
          disabled={cancel.isPending}
        >
          {cancel.isPending ? t('appointments.cancel.pending') : t('appointments.cancel.confirm')}
        </Button>
      </div>
    </form>
  );
}
