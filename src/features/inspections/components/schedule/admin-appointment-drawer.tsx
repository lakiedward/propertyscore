import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { CalendarClockIcon, CalendarXIcon, UserMinusIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
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
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-120">
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
        <div className="flex flex-col gap-2.5 rounded-lg border border-card bg-card p-3.5 shadow-card-soft">
          <strong className="text-body-sm">{t('schedule.drawer.inspector')}</strong>
          <AssignInspector inspection={inspection} />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="touch-target"
              onClick={onReschedule}
            >
              <CalendarClockIcon aria-hidden />
              {t('appointments.reschedule.open')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="touch-target"
              aria-expanded={isCancelling}
              onClick={() => {
                setIsCancelling(true);
              }}
            >
              <CalendarXIcon aria-hidden />
              {t('appointments.cancel.open')}
            </Button>
          </div>
        </div>
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
  const inspectors = useQuery(inspectionQueries.inspectors(inspection.city_id));
  const assign = useAssignInspector();
  const unassign = useUnassignInspector();
  const [inspectorId, setInspectorId] = useState(inspection.inspector_id ?? '');
  const isChange = inspection.inspector_id !== null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <FieldLabel htmlFor={selectId} className="sr-only">
            {t('schedule.drawer.inspector')}
          </FieldLabel>
          <Select value={inspectorId} onValueChange={setInspectorId}>
            <SelectTrigger id={selectId}>
              <SelectValue placeholder={t('schedule.drawer.choose')} />
            </SelectTrigger>
            <SelectContent>
              {(inspectors.data ?? [])
                .filter((inspector) => inspector.is_active)
                .map((inspector) => (
                  <SelectItem key={inspector.user_id} value={inspector.user_id}>
                    {t('schedule.drawer.option', {
                      name: inspector.full_name ?? '',
                      city: inspector.city_name,
                    })}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          size="sm"
          className="touch-target"
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
      {isChange ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="touch-target w-fit"
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
      {assign.isError ? (
        <Alert tone="error">
          <AlertDescription>{errorMessage(assign.error)}</AlertDescription>
        </Alert>
      ) : null}
    </div>
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
