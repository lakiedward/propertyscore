import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { Photo } from '@/components/media/photo';
import { ServiceCard } from '@/components/property/service-card';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';
import heroImage from '@/assets/home/hero-living.webp';

const HERO_IMAGE_CLASS = 'min-h-100 rounded-2xl lg:min-h-152';

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
    <section aria-labelledby="home-title" className="overflow-hidden">
      <div className="mx-auto grid max-w-wide gap-10 px-gutter pt-12 pb-20 lg:grid-cols-[1fr_1.04fr] lg:gap-12 lg:pt-16 lg:pb-26">
        <div className="flex flex-col gap-6">
          <h1 id="home-title" className="text-display text-balance text-brand">
            <span className="block">{t('hero.titleLead')}</span>
            <span className="block">
              <span className="marker-cta">{t('hero.titleAccent')}</span>
            </span>
          </h1>
          <p className="max-w-xl text-body text-muted-foreground lg:text-lead">{t('hero.lead')}</p>
          <div aria-label={t('hero.servicesLabel')} role="group" className="flex flex-col gap-4">
            <ServiceCard
              tone="online"
              hash={HOME_SECTION.smartCheck}
              price={smartCheckPrice}
              action={t('hero.smartCheck.action')}
              brand={
                <span className="flex items-center gap-2">
                  <BrandMark product="smartcheck" tone="inverse" size={32} />
                  <Logo
                    product="smartcheck"
                    tone="inverse"
                    size="sm"
                    hasMark={false}
                    isDecorative
                  />
                </span>
              }
            >
              <strong className="font-bold text-on-inverse">{t('hero.smartCheck.strong')}</strong>{' '}
              {t('hero.smartCheck.text')}
            </ServiceCard>
            <ServiceCard
              tone="forest"
              hash={HOME_SECTION.physical}
              price={physicalPrice}
              action={t('hero.physical.action')}
              brand={
                <span className="flex items-center gap-2">
                  <BrandMark product="physical" size={32} />
                  <Logo product="physical" tone="inverse" size="sm" hasMark={false} isDecorative />
                </span>
              }
              extra={
                <span className="flex items-center gap-2 text-meta text-on-inverse-muted">
                  <BrandMark product="smartcheck" tone="inverse" size={16} />
                  {t('hero.physical.included', { price: smartCheckPrice })}
                </span>
              }
            >
              <strong className="font-bold text-cta">{t('hero.physical.strong')}</strong>{' '}
              {t('hero.physical.text')}
            </ServiceCard>
          </div>
          <p className="text-caption text-muted-foreground">
            {t('hero.note', { smartCheckPrice, physicalPrice })}
          </p>
        </div>
        <div className="relative isolate min-h-100 lg:min-h-152">
          <div
            aria-hidden="true"
            className="absolute -top-7 -right-7 bottom-9 left-9 -z-10 rounded-2xl bg-category-transport-fill"
          />
          <Photo
            src={heroImage}
            alt={t('hero.imageAlt')}
            label={t('examples.illustrative')}
            ratio="fill"
            isEager
            className="h-full"
            imageClassName={HERO_IMAGE_CLASS}
          />
          <div className="absolute top-6 left-4 max-w-56 rounded-xl bg-card p-4 shadow-lg sm:left-6">
            <p className="text-label">{t('hero.floatTitle')}</p>
            <p className="mt-2 border-t border-border-subtle pt-2 text-caption text-muted-foreground">
              {t('hero.floatText')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
