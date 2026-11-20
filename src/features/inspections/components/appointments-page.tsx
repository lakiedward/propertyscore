import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { cva } from 'class-variance-authority';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { PanelPageHeader } from '@/components/layout/panel-page-header';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { Button } from '@/components/ui/button';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatDate, formatPrice } from '@/i18n/format';
import { inspectionQueries } from '../api/inspections.queries';
import type { MyInspection } from '../inspection.types';
import { useBookingText } from '../hooks/use-booking-text';
import { sortAppointments } from '../inspection.utils';
import { AppointmentDrawer } from './appointment-drawer';
import { InspectionStatusPill } from './inspection-status-pill';

const route = getRouteApi('/_authenticated/account/appointments');

const bandVariants = cva('flex flex-col items-center justify-center px-1.5 py-3 tabular-nums', {
  variants: {
    status: {
      scheduled: 'bg-step-leaf-surface text-step-leaf-ink',
      inspector_assigned: 'bg-primary text-primary-foreground',
      completed: 'bg-surface-alt text-foreground',
      book_ready: 'bg-cta text-cta-foreground',
      cancelled: 'bg-surface-alt text-muted-foreground',
    },
  },
});

const TIME = { hour: '2-digit', minute: '2-digit' } as const;

export function AppointmentsPage() {
  const { t } = useTranslation('inspections');
  const { user } = route.useRouteContext();
  const { sheet, mode } = route.useSearch();
  const navigate = route.useNavigate();
  const { data } = useSuspenseQuery(inspectionQueries.mine(user.id));
  const [now] = useState(() => new Date());
  const appointments = sortAppointments(data, now);
  const selected = appointments.find((appointment) => appointment.id === sheet);
  const price = formatPrice(SERVICE_PRICES.physical.amount, SERVICE_PRICES.physical.currency);

  return (
    <div className="flex flex-col gap-5">
      <PanelPageHeader
        description={t('appointments.description')}
        actions={
          appointments.length > 0 ? (
            <Button asChild variant="cta" size="md">
              <Link to="/inspection">
                {t('appointments.new')}
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-meta tabular-nums">
                  {price}
                </span>
              </Link>
            </Button>
          ) : undefined
        }
      />
      {appointments.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-card bg-card p-2 pb-5 shadow-card-soft">
          <EmptyState
            kind="empty"
            title={t('appointments.empty.title')}
            description={t('appointments.empty.text')}
            className="border-0 bg-transparent"
          />
          <div className="flex flex-wrap justify-center gap-2.5">
            <Button asChild variant="cta" size="md">
              <Link to="/inspection">
                {t('appointments.empty.book')}
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-meta tabular-nums">
                  {price}
                </span>
              </Link>
            </Button>
            <Button asChild variant="secondary" size="md">
              <Link to="/" hash={HOME_SECTION.smartCheck}>
                {t('appointments.empty.check')}
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              <AppointmentRow
                appointment={appointment}
                onOpen={() => {
                  void navigate({ search: { sheet: appointment.id } });
                }}
              />
            </li>
          ))}
        </ul>
      )}
      {selected ? (
        <AppointmentDrawer
          appointment={selected}
          mode={mode}
          now={now}
          onModeChange={(nextMode) => {
            void navigate({
              search: { sheet: selected.id, mode: nextMode === 'details' ? undefined : nextMode },
              replace: true,
            });
          }}
          onClose={() => {
            void navigate({ search: {} });
          }}
        />
      ) : null}
    </div>
  );
}

type AppointmentRowProps = {
  appointment: MyInspection;
  onOpen: () => void;
};

function AppointmentRow({ appointment, onOpen }: AppointmentRowProps) {
  const { t } = useTranslation('inspections');
  const text = useBookingText();
  const startsAt = new Date(appointment.starts_at);

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onOpen}
      className="grid w-full grid-cols-[64px_minmax(0,1fr)] overflow-hidden rounded-lg border border-card bg-card text-left text-foreground shadow-card-soft outline-none hover:border-border-strong hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 data-[cancelled=true]:opacity-75 sm:grid-cols-[84px_minmax(0,1fr)]"
      data-cancelled={appointment.status === 'cancelled'}
    >
      <span className={bandVariants({ status: appointment.status })}>
        <strong className="text-[24px] leading-none">{startsAt.getDate()}</strong>
        <span className="text-meta font-bold uppercase">
          {formatDate(startsAt, { month: 'short' })}
        </span>
      </span>
      <span className="flex min-w-0 flex-col gap-1 px-4 py-3.5">
        <span className="flex flex-wrap items-center justify-between gap-2.5">
          <span className="text-eyebrow">
            {t('appointments.rowEyebrow', { time: formatDate(startsAt, TIME) })}
          </span>
          <InspectionStatusPill status={appointment.status} audience="client" />
        </span>
        <strong className="text-body leading-[1.35]">
          {text.addressLine(appointment.address_text, appointment.city_name)}
        </strong>
        <span className="text-small text-muted-foreground">
          {appointment.status === 'cancelled'
            ? t('appointments.cancelledOn', {
                date: formatDate(appointment.cancelled_at ?? appointment.starts_at),
              })
            : appointment.inspector_name
              ? t('appointments.inspector', { name: appointment.inspector_name })
              : t('appointments.inspectorPending')}
        </span>
      </span>
    </button>
  );
}
