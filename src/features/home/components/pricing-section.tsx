import { Trans, useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';
import { useBrandNames } from '../hooks/use-brand-names';
import { ConsultationCard } from './consultation-card';
import { PriceCard } from './price-card';
import { SectionTitle } from './section-title';
import { ServiceComparison } from './service-comparison';

export function PricingSection() {
  const { t } = useTranslation('home');
  const brands = useBrandNames();
  const smartCheckPrice = formatPrice(
    SERVICE_PRICES.smartCheck.amount,
    SERVICE_PRICES.smartCheck.currency,
  );

  return (
    <section
      id={HOME_SECTION.pricing}
      aria-labelledby="pricing-title"
      className="bg-background py-13.75 w520:py-17.5 w820:py-24"
    >
      <div className="page-wrap flex flex-col">
        <div className="mb-7.5 max-w-212.5">
          <SectionTitle
            id="pricing-title"
            className="my-3.5 text-foreground"
            accentClassName="text-muted-foreground"
            lead={t('pricing.titleLead')}
            accent={
              <Trans
                t={t}
                i18nKey="pricing.titleAccent"
                components={{
                  area: <span className="marker-info text-info" />,
                  home: <span className="marker-cta text-brand" />,
                }}
              />
            }
          />
          <p className="max-w-170 text-body text-muted-foreground w520:text-lead w520:leading-[1.6]">
            <Trans
              t={t}
              i18nKey="pricing.lead"
              values={brands}
              components={{ strong: <strong className="font-bold text-foreground" /> }}
            />
          </p>
        </div>

        <div className="mt-2.5 grid grid-cols-1 gap-5 w960:grid-cols-[1.25fr_1fr]">
          <PriceCard
            tone="physical"
            brand={
              <Logo
                product="physical"
                tone="inverse"
                size="xl"
                className="gap-2.5 max-w520:text-logo-bundle"
              />
            }
            amount={SERVICE_PRICES.physical.amount}
            currency={SERVICE_PRICES.physical.currency}
            summary={t('pricing.physical.summary', brands)}
            badge={
              <span className="inline-flex h-10 w-fit flex-wrap items-center gap-2 rounded-full bg-on-inverse/10 pr-3.5 pl-2 text-small font-bold text-on-inverse">
                <BrandMark product="smartcheck" tone="inverse" size={24} />
                {t('pricing.physical.included', brands)}
                <s>{smartCheckPrice}</s>
              </span>
            }
            features={t('pricing.physical.features', { returnObjects: true })}
            cta={t('pricing.physical.cta')}
            ctaHash={HOME_SECTION.physical}
            secondary={t('pricing.physical.secondary')}
            secondaryHash={HOME_SECTION.deliverables}
          />
          <PriceCard
            tone="smartcheck"
            brand={
              <Logo
                product="smartcheck"
                tone="inverse"
                size="xl"
                className="gap-2.5 max-w520:text-logo-bundle"
              />
            }
            amount={SERVICE_PRICES.smartCheck.amount}
            currency={SERVICE_PRICES.smartCheck.currency}
            summary={t('pricing.smartCheck.summary')}
            badge={
              <span className="inline-flex h-10 w-fit items-center rounded-full bg-on-inverse/10 px-3.5 text-small font-bold text-on-inverse">
                {t('pricing.smartCheck.limit')}
              </span>
            }
            features={t('pricing.smartCheck.features', { returnObjects: true })}
            cta={t('pricing.smartCheck.cta')}
            ctaHash={HOME_SECTION.smartCheck}
            secondary={t('pricing.smartCheck.secondary')}
            secondaryHash={HOME_SECTION.deliverables}
          />
        </div>

        <ServiceComparison />
        <ConsultationCard />
        <p className="mt-4 max-w-copy text-meta text-muted-foreground">{t('pricing.finePrint')}</p>
      </div>
    </section>
  );
}
