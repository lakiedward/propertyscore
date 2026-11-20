import { useQuery } from '@tanstack/react-query';
import { getRouteApi, Navigate } from '@tanstack/react-router';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { authQueries, useAuth } from '@/features/auth';
import type { User } from '@supabase/supabase-js';
import { useAccountIdentity } from '@/features/profile';
import { inspectionQueries } from '../api/inspections.queries';
import {
  NEXT_STEP,
  PREVIOUS_STEP,
  reachableStep,
  useBookingStore,
  type BookingStep,
} from '../booking.store';
import { useBookingText } from '../hooks/use-booking-text';
import { BookingHero } from './booking-hero';
import { BookingStepAccess } from './booking-step-access';
import { BookingStepDate } from './booking-step-date';
import { BookingStepHome } from './booking-step-home';
import { BookingStepRequester } from './booking-step-requester';
import { BookingStepReview } from './booking-step-review';
import { BookingSummaryBar, SUMMARY_ICONS, type SummaryItem } from './booking-summary-bar';

const route = getRouteApi('/_site/inspection/');

const STEP_KEYS = {
  1: 'requester',
  2: 'home',
  3: 'date',
  4: 'access',
  5: 'payment',
} as const satisfies Record<BookingStep, string>;

export function BookingPage() {
  const { t } = useTranslation('inspections');
  const { step: requested } = route.useSearch();
  const navigate = route.useNavigate();
  const { user } = useAuth();
  const booking = useBookingStore(
    useShallow(({ choice, home, startsAt, access }) => ({ choice, home, startsAt, access })),
  );
  const reset = useBookingStore((state) => state.reset);
  const cities = useQuery(inspectionQueries.cities());
  const titleId = useId();
  const homeFormId = useId();
  const accessFormId = useId();
  const reachable = user ? reachableStep(booking) : 1;
  const step: BookingStep = requested > reachable ? reachable : requested;

  if (step !== requested) {
    return <Navigate to="/inspection" search={{ step }} replace />;
  }

  const goTo = (target: BookingStep) => {
    void navigate({ search: { step: target } });
    window.scrollTo({ top: 0 });
  };
  const nextStep = NEXT_STEP[step];
  const nextName = nextStep ? t(`booking.steps.${STEP_KEYS[nextStep]}`) : null;
  const nextLabel = nextName
    ? t('booking.summary.continue', { step: nextName.toLowerCase() })
    : null;
  const city = cities.data?.find((option) => option.id === booking.home?.cityId);

  return (
    <div className="bg-surface-warm">
      <BookingHero step={step} />
      <div className="mx-auto max-w-wide px-4 pt-6 pb-14 sm:px-8 sm:pt-9 sm:pb-24">
        <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-4.5">
          <div className="flex flex-col gap-1">
            <span className="text-eyebrow text-step-leaf-ink">
              {t('booking.stepOf', { step, total: 5 })}
            </span>
            <h2 id={titleId} className="text-h2">
              {t(`booking.titles.${STEP_KEYS[step]}`)}
            </h2>
            <p className="text-muted-foreground">{t(`booking.help.${STEP_KEYS[step]}`)}</p>
          </div>
          {step === 1 ? <BookingStepRequester user={user} titleId={titleId} /> : null}
          {step === 2 ? (
            <BookingStepHome
              formId={homeFormId}
              onSaved={() => {
                goTo(3);
              }}
            />
          ) : null}
          {step === 3 && booking.home ? (
            <BookingStepDate cityId={booking.home.cityId} cityName={city?.name ?? ''} />
          ) : null}
          {step === 4 && user ? (
            <BookingStepAccess
              user={user}
              formId={accessFormId}
              onSaved={() => {
                goTo(5);
              }}
            />
          ) : null}
          {step === 5 && user && booking.home && booking.startsAt && booking.access ? (
            <BookingStepReview
              user={user}
              home={booking.home}
              startsAt={booking.startsAt}
              access={booking.access}
              choice={booking.choice}
              cityName={city?.name}
              onEdit={goTo}
              onBooked={(inspectionId) => {
                void navigate({
                  to: '/inspection/confirmation/$inspectionId',
                  params: { inspectionId },
                }).then(reset);
              }}
            />
          ) : null}
          <SummaryBar
            step={step}
            nextName={nextName}
            nextLabel={nextLabel}
            cityName={city?.name}
            homeFormId={homeFormId}
            accessFormId={accessFormId}
            user={user}
            onGoTo={goTo}
          />
        </section>
      </div>
    </div>
  );
}

type SummaryBarProps = {
  step: BookingStep;
  nextName: string | null;
  nextLabel: string | null;
  cityName: string | undefined;
  homeFormId: string;
  accessFormId: string;
  user: User | null;
  onGoTo: (step: BookingStep) => void;
};

function SummaryBar({
  step,
  nextName,
  nextLabel,
  cityName,
  homeFormId,
  accessFormId,
  user,
  onGoTo,
}: SummaryBarProps) {
  const { t } = useTranslation('inspections');
  const text = useBookingText();
  const { name } = useAccountIdentity(user);
  const phone = useQuery({ ...authQueries.accountPhone(user?.id ?? ''), enabled: user !== null });
  const { choice, home, startsAt, access } = useBookingStore(
    useShallow((state) => ({
      choice: state.choice,
      home: state.home,
      startsAt: state.startsAt,
      access: state.access,
    })),
  );
  const items: SummaryItem[] | null =
    step === 1
      ? null
      : [
          {
            key: 'address',
            icon: SUMMARY_ICONS.address,
            label: t('booking.review.rows.address'),
            value: home ? text.address(home, cityName) : t('booking.summary.pending', { step: 2 }),
            isDone: home !== null,
          },
          {
            key: 'date',
            icon: SUMMARY_ICONS.date,
            label: t('booking.review.rows.date'),
            value: startsAt ? text.date(startsAt) : t('booking.summary.pending', { step: 3 }),
            isDone: startsAt !== null,
          },
          {
            key: 'opener',
            icon: SUMMARY_ICONS.opener,
            label: t('booking.review.rows.opener'),
            value: access
              ? text.opener(access, name, phone.data ?? undefined)
              : t('booking.summary.pending', { step: 4 }),
            isDone: access !== null,
          },
        ];
  const previous = PREVIOUS_STEP[step];
  const next =
    step === 2
      ? ({ kind: 'submit', formId: homeFormId } as const)
      : step === 4
        ? ({ kind: 'submit', formId: accessFormId } as const)
        : step === 5
          ? null
          : ({
              kind: 'click',
              isDisabled: step === 1 ? !user || !choice : !startsAt,
              blockedHint: t(
                step === 1 ? 'booking.summary.blocked.requester' : 'booking.summary.blocked.date',
              ),
              onClick: () => {
                onGoTo(step === 1 ? 2 : 4);
              },
            } as const);

  return (
    <BookingSummaryBar
      items={items}
      nextName={step === 1 ? nextName : null}
      nextLabel={nextLabel}
      next={next}
      onBack={
        previous
          ? () => {
              onGoTo(previous);
            }
          : null
      }
    />
  );
}
