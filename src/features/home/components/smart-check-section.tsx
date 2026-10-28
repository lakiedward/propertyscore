import { Link } from '@tanstack/react-router';
import { ArrowDownIcon, ArrowRightIcon, MinusIcon, PlusIcon } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { ExampleLabel } from '@/components/feedback/example-label';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { ScoreValue } from '@/components/trust/score-value';
import { Button } from '@/components/ui/button';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';
import { cn } from '@/lib/utils';
import {
  CATEGORY_TILE_CLASS,
  type CategoryHue,
  PRICES_ICON,
  ZONE_OVERALL_SCORE,
  ZONE_PRICE_PER_M2,
  ZONE_SCORES,
} from '../home.categories';
import { CategoryChipList } from './category-chip-list';
import { HowItWorksSteps } from './how-it-works-steps';
import { ProductPriceBox } from './product-price-box';
import { SectionHeading } from './section-heading';
import { ZoneMapExample } from './zone-map-example';

const SAFETY_UP = ['lighting', 'police', 'embassy', 'eveningShops'] as const;
const SAFETY_DOWN = ['nightBars', 'abandoned', 'unlit', 'vacant'] as const;
const STEPS = ['address', 'pin', 'report'] as const;
const PRICES_CHIP_KEY = 'prices';
const PRICES_CHIP_HUE: CategoryHue = 'city';

export function SmartCheckSection() {
  const { t } = useTranslation('home');
  const price = formatPrice(SERVICE_PRICES.smartCheck.amount, SERVICE_PRICES.smartCheck.currency);

  return (
    <section id={HOME_SECTION.smartCheck} aria-labelledby="smart-check-title" className="bg-card">
      <div className="mx-auto grid max-w-wide gap-10 px-gutter py-section lg:grid-cols-[1.08fr_1fr] lg:gap-14">
        <div className="flex flex-col gap-6">
          <Logo product="smartcheck" size="lg" />
          <SectionHeading
            id="smart-check-title"
            lead={t('smartCheck.titleLead')}
            accent={t('smartCheck.titleAccent')}
            tone="info"
          />
          <CategoryChipList
            label={t('smartCheck.chipsLabel')}
            chips={[
              ...ZONE_SCORES.map((score) => ({
                key: score.key,
                label: t(`smartCheck.categories.${score.key}`),
                icon: score.icon,
                hue: score.key,
              })),
              {
                key: PRICES_CHIP_KEY,
                label: t('smartCheck.categories.prices'),
                icon: PRICES_ICON,
                hue: PRICES_CHIP_HUE,
              },
            ]}
          />
        </div>
        <div className="flex flex-col gap-6 lg:pt-20">
          <p className="text-body text-muted-foreground lg:text-lead">
            <strong className="font-bold text-foreground">{t('smartCheck.leadStrong')}</strong>{' '}
            {t('smartCheck.lead')}
          </p>
          <ProductPriceBox
            product="smartcheck"
            label={t('smartCheck.price.label', { price })}
            name={t('smartCheck.price.name')}
            kind={t('smartCheck.price.kind')}
            price={price}
            footer={t('smartCheck.price.features')}
            ctaLabel={t('smartCheck.price.cta')}
            ctaHash={HOME_SECTION.smartCheck}
          />
          <Link
            to="/"
            hash={HOME_SECTION.deliverables}
            search={(previous) => ({ ...previous, deliverable: 'zone' as const })}
            className="w-fit text-label text-brand underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
          >
            {t('smartCheck.price.example')}
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-wide flex-col gap-8 px-gutter pb-section">
        <div className="grid gap-3 md:grid-cols-2 md:items-end">
          <h3 className="text-h2">{t('smartCheck.report.title')}</h3>
          <p className="text-body text-muted-foreground">{t('smartCheck.report.text')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-info p-6 text-center text-on-inverse shadow-md sm:col-span-2 sm:row-span-2 sm:flex-row sm:text-left lg:flex-col lg:justify-center lg:text-center">
            <ScoreValue
              value={ZONE_OVERALL_SCORE}
              size="xl"
              hue="onInverse"
              surface="dark"
              caption={t('smartCheck.report.outOf')}
              label={t('smartCheck.report.scoreLabel', { score: ZONE_OVERALL_SCORE })}
            />
            <div className="flex flex-col gap-2">
              <p className="text-h4">{t('smartCheck.report.overallLabel')}</p>
              <p className="text-small text-on-info-muted">{t('smartCheck.report.overallText')}</p>
            </div>
          </div>
          {ZONE_SCORES.map((score) => {
            const Icon = score.icon;
            return (
              <div
                key={score.key}
                className="flex flex-col gap-3 rounded-xl bg-card p-5 shadow-md ring-1 ring-border-subtle"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      'grid size-11 place-items-center rounded-lg',
                      CATEGORY_TILE_CLASS[score.key],
                    )}
                  >
                    <Icon aria-hidden className="size-5.5" />
                  </span>
                  <ScoreValue
                    value={score.score}
                    size="sm"
                    hue={score.key}
                    label={t('smartCheck.report.scoreLabel', { score: score.score })}
                  />
                </div>
                <p className="text-h4">{t(`smartCheck.report.tiles.${score.key}.name`)}</p>
                <p className="text-small text-muted-foreground">
                  {t(`smartCheck.report.tiles.${score.key}.text`)}
                </p>
              </div>
            );
          })}
          <div className="flex flex-col gap-3 rounded-xl bg-card p-5 shadow-md ring-1 ring-border-subtle">
            <span
              className={cn('grid size-11 place-items-center rounded-lg', CATEGORY_TILE_CLASS.city)}
            >
              <PRICES_ICON aria-hidden className="size-5.5" />
            </span>
            <p className="text-price-sm text-info">
              {t('smartCheck.report.pricesValue', { price: formatPrice(ZONE_PRICE_PER_M2, 'EUR') })}
            </p>
            <p className="text-h4">{t('smartCheck.report.pricesName')}</p>
            <p className="text-small text-muted-foreground">{t('smartCheck.report.pricesText')}</p>
          </div>
        </div>
        <ExampleLabel label={t('examples.values')} />
      </div>

      <div className="bg-surface-online-inverse text-on-inverse">
        <div className="mx-auto grid max-w-wide gap-10 px-gutter py-section lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div className="flex flex-col gap-6">
            <p className="text-eyebrow text-cta uppercase">{t('smartCheck.map.eyebrow')}</p>
            <SectionHeading
              as="h3"
              lead={t('smartCheck.map.titleLead')}
              accent={t('smartCheck.map.titleAccent')}
              tone="onInverse"
              className="text-on-inverse"
            />
            <p className="text-body text-on-info-muted">{t('smartCheck.map.text')}</p>
            <div className="grid gap-6 sm:grid-cols-2">
              <FactorList
                title={t('smartCheck.map.upTitle')}
                items={SAFETY_UP.map((key) => t(`smartCheck.map.factors.${key}`))}
                effect="up"
              />
              <FactorList
                title={t('smartCheck.map.downTitle')}
                items={SAFETY_DOWN.map((key) => t(`smartCheck.map.factors.${key}`))}
                effect="down"
              />
            </div>
          </div>
          <ZoneMapExample />
        </div>
      </div>

      <div className="mx-auto flex max-w-wide flex-col gap-6 px-gutter py-section">
        <div className="flex flex-col gap-8 rounded-2xl bg-info p-6 text-on-inverse sm:p-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-4">
              <Logo product="smartcheck" tone="inverse" size="md" />
              <SectionHeading
                as="h3"
                lead={t('smartCheck.steps.titleLead')}
                accent={t('smartCheck.steps.titleAccent')}
                tone="onInverse"
                className="text-on-inverse"
              />
            </div>
            <Button asChild variant="inverse" shape="pill" size="lg">
              <Link to="/" hash={HOME_SECTION.pricing}>
                {t('smartCheck.steps.cta', { price })}
                <ArrowRightIcon aria-hidden />
              </Link>
            </Button>
          </div>
          <HowItWorksSteps
            tone="onInfo"
            steps={STEPS.map((key) => ({
              key,
              title: t(`smartCheck.steps.items.${key}.title`),
              text: t(`smartCheck.steps.items.${key}.text`),
            }))}
          />
        </div>
        <Link
          to="/"
          hash={HOME_SECTION.physical}
          className="flex items-center justify-between gap-4 rounded-xl bg-surface-subtle p-5 text-body ring-1 ring-border-subtle transition-shadow duration-(--duration-fast) hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="flex items-center gap-3">
            <BrandMark product="physical" size={32} />
            <span>
              <Trans
                t={t}
                i18nKey="smartCheck.crossSell"
                components={{ strong: <strong className="font-bold" /> }}
              />
            </span>
          </span>
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-cta"
          >
            <ArrowDownIcon className="size-4" />
          </span>
        </Link>
      </div>
    </section>
  );
}

type FactorListProps = { title: string; items: string[]; effect: 'up' | 'down' };

function FactorList({ title, items, effect }: FactorListProps) {
  const Icon = effect === 'up' ? PlusIcon : MinusIcon;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-label">{title}</p>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-small text-on-info-muted">
            <span
              aria-hidden
              className={cn(
                'grid size-5.5 place-items-center rounded-full text-on-inverse',
                effect === 'up' ? 'bg-map-safety-up' : 'bg-map-safety-down',
              )}
            >
              <Icon className="size-3" />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
