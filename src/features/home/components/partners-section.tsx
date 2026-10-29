import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';
import { PartnerEarningsCalculator } from './partner-earnings-calculator';

export function PartnersSection() {
  const { t } = useTranslation('home');
  const price = formatPrice(SERVICE_PRICES.physical.amount, SERVICE_PRICES.physical.currency);
  const commission = formatPrice(
    SERVICE_PRICES.partnerCommission.amount,
    SERVICE_PRICES.partnerCommission.currency,
  );
  const steps = t('partners.steps', { returnObjects: true, price, commission });

  return (
    <section
      id={HOME_SECTION.partners}
      aria-labelledby="partners-title"
      className="border-y border-border-subtle bg-card py-18 w960:py-24"
    >
      <div className="page-wrap grid grid-cols-1 items-center gap-x-[clamp(40px,6vw,96px)] gap-y-10 w960:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col gap-5.5">
          <p className="text-meta font-extrabold tracking-[0.06em] text-muted-foreground uppercase">
            {t('partners.eyebrow')}
          </p>
          <h2
            id="partners-title"
            className="max-w-170 text-[clamp(36px,4vw,60px)] leading-[1.05] font-[740] tracking-[-0.035em] text-brand"
          >
            <span className="block">{t('partners.titleLead')}</span>
            <span className="marker-cta">{t('partners.titleAccent', { price: commission })}</span>
          </h2>
          <p className="max-w-140 text-lead-sm text-ink-soft">
            {t('partners.text', { price, commission })}
          </p>
          <ol className="grid grid-cols-1 gap-3 w560:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="flex flex-col gap-0.75 rounded-lg border border-border-subtle bg-background p-3.5"
              >
                <span className="mb-1.5 grid size-7 place-items-center rounded-full bg-primary text-small font-extrabold text-on-inverse">
                  {index + 1}
                </span>
                <strong className="text-label font-extrabold text-brand">{step.title}</strong>
                <span className="text-meta text-muted-foreground">{step.text}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3.5">
            <Link
              to="/"
              hash={HOME_SECTION.partners}
              className="inline-flex min-h-12.5 items-center gap-3 rounded-full bg-primary py-0 pr-2 pl-5 text-label font-extrabold text-on-inverse transition-colors hover:bg-primary-hover focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
            >
              {t('partners.cta')}
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-full bg-cta text-brand"
              >
                <ArrowRightIcon className="size-4" />
              </span>
            </Link>
            <Link
              to="/"
              hash={HOME_SECTION.partners}
              className="text-small font-bold text-brand underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
            >
              {t('partners.existing')}
            </Link>
          </div>
        </div>
        <PartnerEarningsCalculator />
      </div>
    </section>
  );
}
