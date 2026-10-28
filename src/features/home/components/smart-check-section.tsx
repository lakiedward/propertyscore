import { Link } from '@tanstack/react-router';
import { ArrowDownIcon, ArrowRightIcon, MinusIcon, PlusIcon } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatNumber, formatPrice } from '@/i18n/format';
import { cn } from '@/lib/utils';
import {
  CATEGORY_TILE_CLASS,
  type CategoryHue,
  PRICES_ICON,
  ZONE_OVERALL_SCORE,
  ZONE_PRICE_PER_M2,
  ZONE_SCORES,
} from '../home.categories';
import { ProductPriceBox } from './product-price-box';
import { ScoreRing } from './score-ring';
import { ZoneMapExample } from './zone-map-example';

const SAFETY_UP = ['lighting', 'police', 'embassy', 'eveningShops'] as const;
const SAFETY_DOWN = ['nightBars', 'abandoned', 'unlit', 'vacant'] as const;
const STEPS = ['address', 'pin', 'report'] as const;
const PRICES_CHIP_HUE: CategoryHue = 'city';

const tileClassName = 'flex flex-col gap-2 rounded-xl bg-card p-5 text-info-ink shadow-tile';

export function SmartCheckSection() {
  const { t } = useTranslation('home');
  const { amount, currency } = SERVICE_PRICES.smartCheck;
  const price = formatPrice(amount, currency);
  const chips = [
    ...ZONE_SCORES.map((score) => ({ key: score.key, icon: score.icon, hue: score.key })),
    { key: 'prices' as const, icon: PRICES_ICON, hue: PRICES_CHIP_HUE },
  ];

  return (
    <section id={HOME_SECTION.smartCheck} aria-labelledby="smart-check-title">
      <div className="bg-card pt-23 pb-13.75">
        <div className="page-wrap grid grid-cols-1 gap-4.25 w520:gap-4.75 w900:grid-cols-2 w900:gap-7.5 w1080:grid-cols-[1.08fr_1fr] w1080:gap-18">
          <div className="flex flex-col items-start gap-7">
            <Logo product="smartcheck" size="lg" className="gap-2" />
            <h2 id="smart-check-title" className="max-w-155 text-section text-brand">
              <span className="block">{t('smartCheck.titleLead')}</span>
              <span className="block text-info">{t('smartCheck.titleAccent')}</span>
            </h2>
            <ul
              aria-label={t('smartCheck.chipsLabel')}
              className="flex max-w-155 flex-wrap gap-2.5"
            >
              {chips.map((chip) => {
                const Icon = chip.icon;
                return (
                  <li
                    key={chip.key}
                    className={cn(
                      'inline-flex h-10 items-center gap-2 rounded-full pr-3.5 pl-2.5 text-small font-bold',
                      CATEGORY_TILE_CLASS[chip.hue],
                    )}
                  >
                    <Icon aria-hidden className="size-4.5" />
                    <span className="text-info-ink">{t(`smartCheck.categories.${chip.key}`)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex flex-col items-start gap-7">
            <p className="text-lg leading-[1.55] text-info-ink-muted w520:text-intro">
              <strong className="font-bold text-info-ink">{t('smartCheck.leadStrong')}</strong>{' '}
              {t('smartCheck.lead')}
            </p>
            <ProductPriceBox
              product="smartcheck"
              label={t('smartCheck.price.label', { price })}
              kind={t('smartCheck.price.kind')}
              amount={amount}
              currency={currency}
              footer={t('smartCheck.price.features')}
              ctaLabel={t('smartCheck.price.cta')}
              ctaHash={HOME_SECTION.smartCheck}
            />
            <Link
              to="/"
              hash={HOME_SECTION.deliverables}
              search={(previous) => ({ ...previous, deliverable: 'zone' as const })}
              className="-mt-1 text-small font-bold text-info underline underline-offset-4 focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
            >
              {t('smartCheck.price.example')}
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-card pt-14 pb-16 text-info-ink w960:pb-20">
        <div className="page-wrap">
          <div className="mb-9 grid grid-cols-1 gap-x-12 gap-y-4 w760:grid-cols-2">
            <h3 className="text-h2 text-info-ink">{t('smartCheck.report.title')}</h3>
            <p className="max-w-copy text-lead-sm text-info-ink-muted">
              {t('smartCheck.report.text')}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3.5 w480:grid-cols-2 w1080:grid-cols-4">
            <div className="flex flex-wrap items-center gap-5 rounded-2xl bg-info p-7.5 text-on-inverse shadow-info w480:col-span-2 w1080:row-span-2 w1080:flex-col w1080:flex-nowrap w1080:items-start">
              <p className="text-caption font-extrabold tracking-[0.06em] text-on-info-muted uppercase">
                {t('smartCheck.report.overallLabel')}
              </p>
              <ScoreRing
                value={ZONE_OVERALL_SCORE}
                tone="overall"
                caption={t('smartCheck.report.outOf')}
                label={t('smartCheck.report.scoreLabel', { score: ZONE_OVERALL_SCORE })}
                className="w-37.5 w1080:my-auto w1080:w-55 w1080:self-center"
              />
              <p className="max-w-90 flex-[1_1_220px] text-body text-info-surface w1080:flex-none">
                {t('smartCheck.report.overallText')}
              </p>
            </div>
            {ZONE_SCORES.map((score) => {
              const Icon = score.icon;
              return (
                <div key={score.key} className={tileClassName}>
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={cn(
                        'grid size-11 place-items-center rounded-icon',
                        CATEGORY_TILE_CLASS[score.key],
                      )}
                    >
                      <Icon aria-hidden className="size-5.5" />
                    </span>
                    <ScoreRing
                      value={score.score}
                      tone={score.key}
                      label={t('smartCheck.report.scoreLabel', { score: score.score })}
                      className="w-13"
                    />
                  </div>
                  <h4 className="text-h4 leading-[1.15] font-extrabold tracking-[-0.02em]">
                    {t(`smartCheck.report.tiles.${score.key}.name`)}
                  </h4>
                  <p className="max-w-copy text-small text-info-ink-muted">
                    {t(`smartCheck.report.tiles.${score.key}.text`)}
                  </p>
                </div>
              );
            })}
            <div className={tileClassName}>
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={cn(
                    'grid size-11 place-items-center rounded-icon',
                    CATEGORY_TILE_CLASS[PRICES_CHIP_HUE],
                  )}
                >
                  <PRICES_ICON aria-hidden className="size-5.5" />
                </span>
              </div>
              <p className="-mt-1 mb-1 text-price-box tracking-[-0.045em] tabular-nums">
                {formatNumber(ZONE_PRICE_PER_M2)}
                <small className="ms-1 text-small font-bold tracking-normal text-info">
                  {t('smartCheck.report.priceUnit')}
                </small>
              </p>
              <h4 className="text-h4 leading-[1.15] font-extrabold tracking-[-0.02em]">
                {t('smartCheck.report.pricesName')}
              </h4>
              <p className="max-w-copy text-small text-info-ink-muted">
                {t('smartCheck.report.pricesText')}
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-copy text-caption text-info-ink-muted">{t('examples.values')}</p>
        </div>
      </div>

      <div className="bg-surface-online-inverse py-18 text-on-inverse w960:py-24">
        <div className="page-wrap grid grid-cols-1 items-center gap-[clamp(40px,6vw,96px)] w960:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div>
            <p className="flex items-center gap-2.25 text-meta font-[760] tracking-[0.025em] text-cta">
              <span aria-hidden="true" className="size-2 rounded-full bg-cta" />
              {t('smartCheck.map.eyebrow')}
            </p>
            <h3 className="mt-4 mb-4.5 text-band text-on-inverse">
              <span className="block">{t('smartCheck.map.titleLead')}</span>
              <span className="block text-cta">{t('smartCheck.map.titleAccent')}</span>
            </h3>
            <p className="max-w-copy text-lead-sm leading-[1.65] text-on-info-muted">
              {t('smartCheck.map.text')}
            </p>
            <div className="mt-8 grid grid-cols-1 gap-6 border-t border-on-inverse/16 pt-7 w520:grid-cols-2">
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

      <div className="page-wrap flex flex-col gap-5 pt-14 pb-16">
        <div className="flex flex-col gap-8 rounded-2xl bg-info px-10 pt-8 pb-9 text-on-inverse">
          <div className="flex flex-wrap items-center justify-between gap-x-7 gap-y-4">
            <div className="flex flex-col gap-3">
              <Logo product="smartcheck" tone="inverse" size="lg" className="gap-2" />
              <h3 className="text-[clamp(18px,1.6vw,22px)] leading-[1.25] font-extrabold tracking-[-0.02em]">
                {t('smartCheck.steps.titleLead')}{' '}
                <span className="text-cta">{t('smartCheck.steps.titleAccent')}</span>
              </h3>
            </div>
            <Link
              to="/"
              hash={HOME_SECTION.pricing}
              className="inline-flex min-h-12.5 items-center gap-3 rounded-full bg-card py-0 pr-2 pl-5 text-label font-extrabold text-info transition-colors duration-(--duration-fast) focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none"
            >
              {t('smartCheck.steps.cta', { price })}
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-full bg-cta text-info-ink"
              >
                <ArrowRightIcon className="size-4" />
              </span>
            </Link>
          </div>
          <ol className="grid grid-cols-1 gap-4.5 w760:grid-cols-3 w760:gap-6">
            {STEPS.map((key, index) => (
              <li
                key={key}
                className="relative flex flex-col gap-1.5 pl-14 w760:pl-0 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:top-11 [&:not(:last-child)]:before:-bottom-4.5 [&:not(:last-child)]:before:left-4.75 [&:not(:last-child)]:before:w-0.5 [&:not(:last-child)]:before:bg-on-inverse/30 w760:[&:not(:last-child)]:before:top-4.75 w760:[&:not(:last-child)]:before:right-[-24px] w760:[&:not(:last-child)]:before:bottom-auto w760:[&:not(:last-child)]:before:left-10 w760:[&:not(:last-child)]:before:h-0.5 w760:[&:not(:last-child)]:before:w-auto"
              >
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-0 z-1 mb-2.5 grid size-10 place-items-center rounded-full bg-cta text-lead-sm font-extrabold text-info-ink shadow-[0_0_0_6px_var(--info)] w760:relative"
                >
                  {index + 1}
                </span>
                <strong className="mt-2 text-lg font-extrabold w760:mt-0">
                  {t(`smartCheck.steps.items.${key}.title`)}
                </strong>
                <p className="max-w-copy text-small text-on-info-muted">
                  {t(`smartCheck.steps.items.${key}.text`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
        <Link
          to="/"
          hash={HOME_SECTION.physical}
          className="flex items-center gap-3 rounded-xl bg-card py-3.5 pr-4 pl-4.5 text-label font-normal text-info-ink shadow-tile-sm transition-shadow duration-(--duration-fast) hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
        >
          <BrandMark product="physical" size={28} />
          <span className="flex-1">
            <Trans
              t={t}
              i18nKey="smartCheck.crossSell"
              components={{ strong: <strong className="font-bold text-brand" /> }}
            />
          </span>
          <span
            aria-hidden="true"
            className="grid size-8.5 shrink-0 place-items-center rounded-full bg-primary text-cta"
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
    <div>
      <p className="flex items-center gap-2.5 text-label font-bold">
        <span
          aria-hidden="true"
          className={cn(
            'grid size-6 place-items-center rounded-full text-info-ink',
            effect === 'up' ? 'bg-map-safety-up-soft' : 'bg-map-safety-down-soft',
          )}
        >
          <Icon className="size-3.5" strokeWidth={3} />
        </span>
        {title}
      </p>
      <ul className="mt-3.5 flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item} className="pl-8.5 text-label font-normal text-info-surface">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
