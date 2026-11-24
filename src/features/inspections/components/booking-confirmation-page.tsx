import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import {
  CalendarDaysIcon,
  CalendarPlusIcon,
  CircleCheckIcon,
  HouseIcon,
  MapPinIcon,
  UserIcon,
} from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { StageTimeline, type Stage } from '@/components/feedback/stage-timeline';
import { LazyMapCanvas } from '@/components/map/lazy-map-canvas';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/i18n/format';
import { inspectionQueries } from '../api/inspections.queries';
import { useBookingText } from '../hooks/use-booking-text';
import { inspectionIcs } from '../slots.utils';

const route = getRouteApi('/_site/inspection/confirmation/$inspectionId');

const PREP_ITEMS = ['rooms', 'meters', 'papers', 'heating', 'worries'] as const;

const MAP_ZOOM = 15;

const MARKER_ID = 'inspection';

export function BookingConfirmationPage() {
  const { t } = useTranslation('inspections');
  const { inspectionId } = route.useParams();
  const { data: inspection } = useSuspenseQuery(inspectionQueries.booked(inspectionId));
  const text = useBookingText();
  const nextId = useId();
  const prepId = useId();
  const property = inspection.property;
  const isAssigned = inspection.status === 'inspector_assigned';
  const dateText = text.date(inspection.starts_at);
  const facts = [
    t(`propertyType.${property.property_type}`),
    t('agenda.area', { area: formatNumber(property.area_m2) }),
    ...(property.floor !== null && property.building_floors !== null
      ? [t('agenda.floor', { floor: property.floor, floors: property.building_floors })]
      : []),
  ].join(' · ');
  const rows = [
    {
      key: 'address',
      icon: MapPinIcon,
      value: text.addressLine(property.address_text, property.city.name),
    },
    { key: 'home', icon: HouseIcon, value: facts },
    { key: 'date', icon: CalendarDaysIcon, value: dateText },
    {
      key: 'opener',
      icon: UserIcon,
      value: [inspection.access_name, inspection.access_phone].filter(Boolean).join(' · '),
    },
  ] as const;
  const stages: Stage[] = [
    {
      id: 'assigned',
      label: t('booking.confirmation.stages.assigned'),
      meta: t('booking.confirmation.stages.assignedMeta'),
      state: isAssigned ? 'done' : 'current',
      stateText: isAssigned ? undefined : t('booking.confirmation.stages.next'),
    },
    {
      id: 'visit',
      label: t('booking.confirmation.stages.visit'),
      meta: t('booking.confirmation.stages.visitMeta', { date: dateText }),
      state: 'upcoming',
    },
    {
      id: 'book',
      label: t('booking.confirmation.stages.book'),
      meta: t('booking.confirmation.stages.bookMeta'),
      state: 'upcoming',
    },
  ];

  const downloadIcs = () => {
    const file = new Blob(
      [
        inspectionIcs({
          id: inspection.id,
          title: t('booking.confirmation.icsTitle'),
          location: rows[0].value,
          startsAt: inspection.starts_at,
          endsAt: inspection.ends_at,
          now: new Date(),
        }),
      ],
      { type: 'text/calendar;charset=utf-8' },
    );
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = t('booking.confirmation.icsFileName', { number: inspection.number });
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-surface-warm">
      <section className="bg-step-leaf-soft">
        <div className="page-wrap grid items-center gap-7 py-8 w960:grid-cols-[minmax(0,1fr)_440px] sm:py-14">
          <div className="flex flex-col items-start gap-3.5">
            <span className="grid size-14 place-items-center rounded-full bg-cta text-cta-foreground">
              <CircleCheckIcon aria-hidden className="size-7.5" />
            </span>
            <span className="text-caption font-bold tracking-label text-step-leaf-ink uppercase">
              {t('booking.confirmation.eyebrow', { number: inspection.number })}
            </span>
            <h1 className="text-[30px] leading-[1.08] font-extrabold tracking-[-0.035em] sm:text-[40px]">
              {t('booking.confirmation.title')}
            </h1>
            <p className="text-[18px] text-muted-foreground">{t('booking.confirmation.text')}</p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Button asChild variant="cta">
                <Link to="/account/appointments">
                  <CalendarDaysIcon aria-hidden />
                  {t('booking.confirmation.view')}
                </Link>
              </Button>
              <Button type="button" variant="secondary" onClick={downloadIcs}>
                <CalendarPlusIcon aria-hidden />
                {t('booking.confirmation.calendar')}
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl bg-card">
            <LazyMapCanvas
              label={t('booking.confirmation.mapLabel')}
              center={[property.longitude, property.latitude]}
              zoom={MAP_ZOOM}
              markers={[
                {
                  id: MARKER_ID,
                  position: [property.longitude, property.latitude],
                  node: (
                    <MapPinIcon aria-hidden className="size-8 fill-cta text-brand drop-shadow-md" />
                  ),
                },
              ]}
              errorFallback={null}
              className="h-45 rounded-none"
              fallbackClassName="h-45 rounded-none"
            />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-x-4.5 gap-y-3 px-4.5 py-4">
              {rows.map(({ key, icon: Icon, value }) => (
                <div key={key} className="flex items-start gap-2.5">
                  <Icon aria-hidden className="mt-0.5 size-4.5 shrink-0 text-step-leaf-solid" />
                  <div className="flex flex-col">
                    <span className="text-meta text-muted-foreground">
                      {t(`booking.review.rows.${key}`)}
                    </span>
                    <strong className="text-small first-letter:uppercase">{value}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className="page-wrap grid items-start gap-6 pt-6 pb-14 w960:grid-cols-[minmax(0,1fr)_380px] sm:pt-9 sm:pb-24">
        <section
          aria-labelledby={nextId}
          className="flex flex-col gap-4.5 rounded-photo border border-card bg-card p-4.5 shadow-card-soft sm:p-6"
        >
          <h2 id={nextId} className="text-h3">
            {t('booking.confirmation.nextTitle')}
          </h2>
          <StageTimeline
            label={t('booking.confirmation.nextTitle')}
            stages={stages}
            className="max-sm:hidden"
          />
          <StageTimeline
            label={t('booking.confirmation.nextTitle')}
            stages={stages}
            orientation="vertical"
            className="sm:hidden"
          />
        </section>
        <section
          aria-labelledby={prepId}
          className="flex flex-col gap-3 rounded-xl bg-cta p-4.5 text-cta-foreground sm:p-6"
        >
          <h2 id={prepId} className="text-h3">
            {t('booking.confirmation.prepTitle')}
          </h2>
          <ul className="flex flex-col gap-2">
            {PREP_ITEMS.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 rounded-lg bg-card px-3 py-2.5 text-body-sm leading-[1.4] text-foreground"
              >
                <span
                  aria-hidden
                  className="mt-px size-5 shrink-0 rounded-sm border-2 border-primary"
                />
                {t(`booking.confirmation.prep.${item}`)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
