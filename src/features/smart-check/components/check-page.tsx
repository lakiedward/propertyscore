import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { LngLat } from '@/components/map/map.config';
import { useAuth } from '@/features/auth';
import { smartCheckQueries } from '../api/smart-check.queries';
import { CHECK_PRICE_RON, type CheckAccess } from '../check.utils';
import type {
  CheckDetailsSearch,
  CheckOrder,
  CheckSearch,
  CheckStep,
} from '../smart-check.schemas';
import { CheckAddressStep } from './check-address-step';
import { CheckConfirmStep } from './check-confirm-step';
import { CheckDetailsStep } from './check-details-step';
import { CheckGeneratingStep } from './check-generating-step';
import { CheckHero } from './check-hero';
import { CheckPaymentStep } from './check-payment-step';

const route = getRouteApi('/_site/check');

type Location = { address: string; pin: LngLat };

function locationOf(search: CheckSearch): Location | undefined {
  return search.address !== undefined && search.lat !== undefined && search.lng !== undefined
    ? { address: search.address, pin: [search.lng, search.lat] }
    : undefined;
}

function detailsOf(search: CheckSearch): CheckDetailsSearch {
  return {
    rooms: search.rooms,
    area: search.area,
    floor: search.floor,
    floors: search.floors,
    elevator: search.elevator,
    year: search.year,
  };
}

function effectiveStep(search: CheckSearch, hasLocation: boolean): CheckStep {
  const step = search.step ?? 'address';
  if (step !== 'address' && !hasLocation) {
    return 'address';
  }
  if (step === 'done' && search.report === undefined) {
    return 'payment';
  }
  return step;
}

export function CheckPage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const entitlement = useQuery(smartCheckQueries.unlimitedAccess(user?.id ?? null));
  const access: CheckAccess = !user
    ? 'guest'
    : entitlement.status === 'success'
      ? entitlement.data
        ? 'unlimited'
        : 'standard'
      : entitlement.status;
  const priceRon =
    access === 'guest' || access === 'standard'
      ? CHECK_PRICE_RON
      : access === 'unlimited'
        ? 0
        : null;
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const location = locationOf(search);
  const step = effectiveStep(search, location !== undefined);
  const details = detailsOf(search);

  const goTo = (next: CheckStep, changes: Partial<CheckSearch> = {}) => {
    void navigate({
      search: (previous) => ({ ...previous, ...changes, step: next }),
      resetScroll: true,
    });
  };

  const withLocation = ({ address, pin }: Location): Partial<CheckSearch> => ({
    address,
    lng: pin[0],
    lat: pin[1],
  });

  const order: CheckOrder | undefined = location
    ? {
        ...details,
        address: location.address,
        longitude: location.pin[0],
        latitude: location.pin[1],
        locale: i18n.resolvedLanguage ?? i18n.language,
      }
    : undefined;

  return (
    <>
      <CheckHero step={step} priceRon={priceRon} />
      {step === 'address' || !location || !order ? (
        <CheckAddressStep
          priceRon={priceRon}
          initialAddress={location?.address ?? ''}
          initialPin={location?.pin ?? null}
          onContinue={(next) => {
            goTo('confirm', withLocation(next));
          }}
        />
      ) : step === 'confirm' ? (
        <CheckConfirmStep
          address={location.address}
          pin={location.pin}
          onBack={(next) => {
            goTo('address', withLocation(next));
          }}
          onContinue={(next) => {
            goTo('details', withLocation(next));
          }}
        />
      ) : step === 'details' ? (
        <CheckDetailsStep
          priceRon={priceRon}
          initialDetails={details}
          onBack={() => {
            goTo('confirm');
          }}
          onContinue={(next) => {
            goTo('payment', {
              rooms: next.rooms,
              area: next.area,
              floor: next.floor,
              floors: next.floors,
              elevator: next.elevator,
              year: next.year,
            });
          }}
        />
      ) : step === 'payment' ? (
        <CheckPaymentStep
          access={access}
          priceRon={priceRon}
          order={order}
          onBack={() => {
            goTo('details');
          }}
          onChangeAddress={() => {
            goTo('address');
          }}
          onCreated={(reportId) => {
            goTo('done', { report: reportId });
          }}
        />
      ) : search.report ? (
        <CheckGeneratingStep
          key={search.report}
          reportId={search.report}
          order={order}
          onCreated={(reportId) => {
            goTo('done', { report: reportId });
          }}
        />
      ) : null}
    </>
  );
}
