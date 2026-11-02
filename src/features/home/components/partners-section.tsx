import { useTranslation } from 'react-i18next';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { PillLink } from '@/components/navigation/pill-link';
import { TextLink } from '@/components/navigation/text-link';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatNumber, formatPrice } from '@/i18n/format';
import { useBrandNames } from '../hooks/use-brand-names';
import { PartnerEarningsCalculator } from './partner-earnings-calculator';
import { SectionTitle } from './section-title';

export function PartnersSection() {
  const { t } = useTranslation('home');
  const brands = useBrandNames();
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
          <p className="text-meta font-extrabold tracking-eyebrow text-muted-foreground uppercase">
            {t('partners.eyebrow')}
          </p>
          <SectionTitle
            id="partners-title"
            size="partners"
            className="max-w-170 text-brand"
            lead={t('partners.titleLead')}
            accent={
              <span className="marker-cta">{t('partners.titleAccent', { price: commission })}</span>
            }
          />
          <p className="max-w-140 text-lead-sm text-ink-soft">
            {t('partners.text', { price, commission, ...brands })}
          </p>
          <ol className="grid grid-cols-1 gap-3 w560:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="flex flex-col gap-0.75 rounded-lg border border-border-subtle bg-background p-3.5"
              >
                <span className="mb-1.5 grid size-7 place-items-center rounded-full bg-primary text-small font-extrabold text-on-inverse">
                  {formatNumber(index + 1)}
                </span>
                <strong className="text-label font-extrabold text-brand">{step.title}</strong>
                <span className="text-meta text-muted-foreground">{step.text}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3.5">
            <PillLink to="/sign-up">{t('partners.cta')}</PillLink>
            <TextLink to="/login">{t('partners.existing')}</TextLink>
          </div>
        </div>
        <PartnerEarningsCalculator />
      </div>
    </section>
  );
}
