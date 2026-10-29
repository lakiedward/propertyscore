import { PlusIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/brand/logo';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { ServiceCard } from '@/components/property/service-card';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';
import heroImage from '@/assets/home/hero-living.webp';

export function HomeHero() {
  const { t } = useTranslation('home');
  const physicalPrice = formatPrice(
    SERVICE_PRICES.physical.amount,
    SERVICE_PRICES.physical.currency,
  );
  const smartCheckPrice = formatPrice(
    SERVICE_PRICES.smartCheck.amount,
    SERVICE_PRICES.smartCheck.currency,
  );

  return (
    <section aria-labelledby="home-title" className="overflow-hidden bg-background pt-16 pb-26">
      <div className="page-wrap grid grid-cols-1 gap-7 w820:grid-cols-[1fr_1.04fr] w820:gap-7.5 w1080:gap-12.5">
        <div>
          <h1 id="home-title" className="mt-4.75 mb-5 text-display text-brand">
            <span className="block">{t('hero.titleLead')}</span>
            <span className="marker-under">{t('hero.titleAccent')}</span>
          </h1>
          <p className="max-w-130 text-lead-sm text-muted-foreground">{t('hero.lead')}</p>
          <div
            aria-label={t('hero.servicesLabel')}
            role="group"
            className="mt-8 flex flex-col gap-4.5"
          >
            <ServiceCard
              tone="online"
              hash={HOME_SECTION.smartCheck}
              amount={SERVICE_PRICES.smartCheck.amount}
              currency={SERVICE_PRICES.smartCheck.currency}
              action={t('hero.smartCheck.action')}
              brand={<Logo product="smartcheck" tone="inverse" size="card" isDecorative />}
            >
              <strong>{t('hero.smartCheck.strong')}</strong> {t('hero.smartCheck.text')}
            </ServiceCard>
            <ServiceCard
              tone="forest"
              hash={HOME_SECTION.physical}
              amount={SERVICE_PRICES.physical.amount}
              currency={SERVICE_PRICES.physical.currency}
              action={t('hero.physical.action')}
              brand={<Logo product="physical" tone="inverse" size="card" isDecorative />}
              extra={
                <span className="mt-3 flex items-center gap-2 border-t border-on-inverse/16 pt-2.5">
                  <span
                    aria-hidden="true"
                    className="grid size-4.5 shrink-0 place-items-center rounded-full bg-info text-info-foreground"
                  >
                    <PlusIcon className="size-3" strokeWidth={3} />
                  </span>
                  <Logo
                    product="smartcheck"
                    tone="inverse"
                    size="inline"
                    typeface="body"
                    isDecorative
                  />
                  <span className="text-meta font-medium text-on-inverse-faint">
                    {t('hero.physical.included', { price: smartCheckPrice })}
                  </span>
                </span>
              }
            >
              <strong>{t('hero.physical.strong')}</strong> {t('hero.physical.text')}
            </ServiceCard>
          </div>
          <p className="mt-3.5 max-w-copy text-meta text-muted-foreground">
            {t('hero.note', { smartCheckPrice, physicalPrice })}
          </p>
        </div>
        <div className="relative isolate min-h-97.5 w520:min-h-125 w820:min-h-162.5 w1080:min-h-152.5">
          <div
            aria-hidden="true"
            className="absolute -top-7 -right-7 bottom-9 left-9 -z-10 rounded-2xl bg-category-transport-fill"
          />
          <img
            src={heroImage}
            alt={t('hero.imageAlt')}
            width={1672}
            height={941}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 size-full rounded-photo bg-surface-alt object-cover shadow-photo"
          />
          <div className="absolute top-5 left-3.75 w-52.5 rounded-float bg-card p-3.25 shadow-float w520:w-62 w520:max-w-1/2 w520:px-4.5 w520:py-4 w1080:top-10.75 w1080:-left-10.5">
            <p className="text-label leading-tight font-bold text-brand w520:text-lead-sm w520:leading-tight">
              {t('hero.floatTitle')}
            </p>
            <p className="mt-2.25 border-t border-border pt-2 text-meta text-foreground">
              {t('hero.floatText')}
            </p>
          </div>
          <span className="absolute bottom-4.5 left-4.5 rounded-note bg-photo-note px-2.75 py-2 text-nav-sm text-foreground">
            {t('examples.illustrative')}
          </span>
        </div>
      </div>
    </section>
  );
}
