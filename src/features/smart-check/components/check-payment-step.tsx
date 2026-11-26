import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  LoaderCircleIcon,
  LockIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth';
import { useErrorMessage } from '@/i18n/error-message';
import { isAppError } from '@/lib/errors';
import { smartCheckQueries, useCreateOnlineReport } from '../api/smart-check.queries';
import { CHECK_PRICE_RON } from '../check.utils';
import type { CheckOrder } from '../smart-check.schemas';
import { CheckHero } from './check-hero';
import { CheckOrderSummary } from './check-order-summary';

const ADDRESS_REASONS = new Set([
  'address_invalid',
  'location_invalid',
  'smartCheckOutsideCoverage',
]);

type CheckPaymentStepProps = {
  order: CheckOrder;
  onBack: () => void;
  onChangeAddress: () => void;
  onCreated: (reportId: string) => void;
};

export function CheckPaymentStep({
  order,
  onBack,
  onChangeAddress,
  onCreated,
}: CheckPaymentStepProps) {
  const { t } = useTranslation('smartCheck');
  const { user } = useAuth();
  const { status, data } = useQuery(smartCheckQueries.unlimitedAccess(user?.id ?? null));
  const access = status === 'success' ? (data ? 'unlimited' : 'standard') : status;
  const priceRon =
    !user || access === 'standard' ? CHECK_PRICE_RON : access === 'unlimited' ? 0 : null;

  return (
    <>
      <CheckHero step="payment" priceRon={priceRon} />
      <div className="page-wrap grid max-w-default grid-cols-1 items-start gap-6 py-8 w767:py-10 w1059:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="check-payment-title"
          className="flex flex-col gap-5 rounded-lg border border-card bg-card p-5 shadow-card-soft w767:p-7"
        >
          <h2 id="check-payment-title" className="text-h3 font-extrabold">
            {t('check.payment.title')}
          </h2>
          {user ? (
            <SignedInPayment
              access={access}
              order={order}
              onChangeAddress={onChangeAddress}
              onCreated={onCreated}
            />
          ) : (
            <SignedOutPayment />
          )}
          <div className="border-t border-border-subtle pt-4">
            <Button type="button" variant="ghost" size="lg" onClick={onBack}>
              <ArrowLeftIcon aria-hidden />
              {t('check.payment.back')}
            </Button>
          </div>
        </section>
        <CheckOrderSummary address={order.address} priceRon={priceRon} />
      </div>
    </>
  );
}

function SignedOutPayment() {
  const { t } = useTranslation('smartCheck');
  const redirect = useLocation({ select: (location) => location.href });

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-surface-sunken p-5">
      <div className="flex items-start gap-3">
        <LockIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />
        <div className="flex flex-col gap-1">
          <h3 className="text-body font-extrabold">{t('check.payment.signedOut.title')}</h3>
          <p className="text-small text-muted-foreground">
            {t('check.payment.signedOut.description')}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Button asChild size="lg">
          <Link to="/login" search={{ redirect }}>
            {t('check.payment.signedOut.signIn')}
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/sign-up" search={{ redirect }}>
            {t('check.payment.signedOut.signUp')}
          </Link>
        </Button>
      </div>
    </div>
  );
}

type SignedInPaymentProps = {
  access: 'pending' | 'error' | 'standard' | 'unlimited';
  order: CheckOrder;
  onChangeAddress: () => void;
  onCreated: (reportId: string) => void;
};

function SignedInPayment({ access, order, onChangeAddress, onCreated }: SignedInPaymentProps) {
  const { t } = useTranslation('smartCheck');
  const errorMessage = useErrorMessage();
  const createReport = useCreateOnlineReport();
  const reason = isAppError(createReport.error) ? createReport.error.reason : undefined;

  if (access === 'pending') {
    return <Skeleton className="h-24 rounded-lg" />;
  }

  if (access === 'error') {
    return (
      <Alert tone="error">
        <CircleAlertIcon aria-hidden />
        <AlertDescription>{t('check.payment.accessError')}</AlertDescription>
      </Alert>
    );
  }

  if (access === 'standard') {
    return (
      <Alert tone="info">
        <InfoIcon aria-hidden />
        <AlertTitle className="font-bold">{t('check.payment.comingSoon.title')}</AlertTitle>
        <AlertDescription>{t('check.payment.comingSoon.description')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert tone="success">
        <CircleCheckIcon aria-hidden />
        <AlertTitle className="font-bold">{t('check.payment.unlimited.title')}</AlertTitle>
        <AlertDescription>{t('check.payment.unlimited.description')}</AlertDescription>
      </Alert>
      {createReport.isError ? (
        <Alert tone="error">
          <CircleAlertIcon aria-hidden />
          <AlertDescription className="flex flex-col items-start gap-3">
            {errorMessage(createReport.error)}
            {reason && ADDRESS_REASONS.has(reason) ? (
              <Button type="button" variant="outline" size="sm" onClick={onChangeAddress}>
                {t('check.payment.changeAddress')}
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="button"
        variant="cta"
        size="lg"
        disabled={createReport.isPending}
        aria-busy={createReport.isPending}
        onClick={() => {
          createReport.mutate(order, { onSuccess: onCreated });
        }}
        className="self-stretch w480:self-start"
      >
        {createReport.isPending ? (
          <LoaderCircleIcon aria-hidden className="animate-spin" />
        ) : (
          <LockIcon aria-hidden />
        )}
        {createReport.isPending ? t('check.payment.generating') : t('check.payment.generate')}
      </Button>
    </div>
  );
}
