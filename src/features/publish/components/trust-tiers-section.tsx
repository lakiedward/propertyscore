import { Link } from '@tanstack/react-router';
import { BadgeCheckIcon, MapPinIcon, Rotate3dIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { HOME_SECTION, PUBLISH_SECTION } from '@/components/layout/site-navigation';
import { SERVICE_PRICES } from '@/config/pricing';
import { SplitPrice } from '@/components/property/split-price';
import { formatNumber, formatPrice } from '@/i18n/format';
import { cn } from '@/lib/utils';
import heroImage from '@/assets/home/hero-living.webp';
import { TIER_LISTING } from '../publish.example';

type TierKind = 'plain' | 'smartcheck' | 'physical';

const TRUST_LEVELS = 3;

const TIER_STYLES: Record<
  TierKind,
  { card: string; text: string; bar: string; barOff: string; level: number }
> = {
  plain: {
    card: 'bg-on-inverse/7 text-on-inverse ring-1 ring-on-inverse/12 ring-inset',
    text: 'text-on-inverse-mist',
    bar: 'bg-on-inverse-mist',
    barOff: 'bg-on-inverse/18',
    level: 1,
  },
  smartcheck: {
    card: 'bg-info text-on-inverse shadow-tier-online',
    text: 'text-on-info-mist',
    bar: 'bg-on-inverse',
    barOff: 'bg-on-inverse/18',
    level: 2,
  },
  physical: {
    card: 'bg-cta text-brand shadow-tier-physical w1059:-translate-y-3',
    text: 'text-on-cta-soft',
    bar: 'bg-primary',
    barOff: 'bg-primary/18',
    level: 3,
  },
};

export function TrustTiersSection() {
  const { t } = useTranslation('publish');

  return (
    <section
      id={PUBLISH_SECTION.verified}
      aria-labelledby="publish-tiers-title"
      className="bg-surface-inverse"
    >
      <div className="page-wrap flex flex-col gap-16 py-11 w767:py-20">
        <div className="flex flex-col items-center gap-4.5 text-center">
          <h2
            id="publish-tiers-title"
            className="text-[clamp(36px,4.2vw,60px)] leading-[1.04] font-extrabold tracking-[-0.035em] text-on-inverse"
          >
            <span className="block">{t('tiers.titleLead')}</span>
            <span className="block text-cta">{t('tiers.titleAccent')}</span>
          </h2>
          <p className="max-w-140 text-lg leading-[1.6] text-on-inverse-mist">{t('tiers.intro')}</p>
        </div>
        <ul className="grid grid-cols-1 items-end gap-x-4.5 gap-y-7.5 w1059:grid-cols-3 w1059:gap-4.5">
          <TierCard kind="plain" />
          <TierCard kind="smartcheck" />
          <TierCard kind="physical" />
        </ul>
        <p className="text-center text-small leading-[1.55] text-on-inverse-mist">
          {t('tiers.note')} <span>{t('tiers.illustrative')}</span>
        </p>
      </div>
    </section>
  );
}

function TierCard({ kind }: { kind: TierKind }) {
  const { t } = useTranslation('publish');
  const style = TIER_STYLES[kind];
  const zone = t('tiers.smartCheck.zone', { score: TIER_LISTING.zoneScore });
  const condition = t('tiers.physical.condition', {
    score: formatNumber(TIER_LISTING.conditionScore, { minimumFractionDigits: 1 }),
  });

  return (
    <li className={cn('flex flex-col gap-4 rounded-[22px] px-4 pt-4 pb-5', style.card)}>
      <div aria-hidden="true" className="overflow-hidden rounded-[14px] bg-card shadow-tier-photo">
        <div className="relative aspect-16/10 max-h-55 bg-surface-physical-col w1059:max-h-none">
          <img
            src={heroImage}
            alt=""
            className={cn('size-full object-cover', kind === 'plain' && 'saturate-55')}
          />
          <span className="absolute top-2.5 right-2.5 left-2.5 flex flex-wrap gap-1.5">
            {kind === 'plain' ? (
              <span className="inline-flex h-7 items-center rounded-full bg-card/92 px-2.5 text-meta font-extrabold text-muted-foreground">
                {t('tiers.plain.chip')}
              </span>
            ) : null}
            {kind === 'physical' ? (
              <ProductChip className="bg-primary">
                <BrandMark product="physical" size={24} />
                <Logo
                  product="physical"
                  tone="inverse"
                  size="2xs"
                  hasMark={false}
                  isDecorative
                  className="text-[13px]"
                />
                <span className="tabular-nums">
                  {formatNumber(TIER_LISTING.conditionScore, { minimumFractionDigits: 1 })}
                </span>
              </ProductChip>
            ) : null}
            {kind === 'plain' ? null : (
              <ProductChip className="bg-info">
                <BrandMark product="smartcheck" tone="inverse" size={24} />
                <Logo
                  product="smartcheck"
                  tone="inverse"
                  size="2xs"
                  hasMark={false}
                  isDecorative
                  className="text-[13px]"
                />
                <span className="tabular-nums">{TIER_LISTING.zoneScore}</span>
              </ProductChip>
            )}
          </span>
          {kind === 'physical' ? (
            <span className="absolute right-2.5 bottom-2.5 inline-flex h-6.5 items-center gap-1 rounded-full bg-foreground/78 px-2.25 text-meta font-extrabold text-primary-foreground">
              <Rotate3dIcon className="size-3.5" />
              {t('tiers.physical.tour')}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 px-3.5 pt-3 pb-3.5">
          <span className="flex items-baseline justify-between gap-2">
            <strong className="text-[19px] leading-[1.55] font-bold tracking-[-0.02em] text-foreground tabular-nums">
              {formatPrice(TIER_LISTING.price, TIER_LISTING.currency)}
            </strong>
            <span className="text-caption leading-[1.55] text-muted-foreground">
              {t('tiers.listing.meta', { count: TIER_LISTING.rooms, area: TIER_LISTING.surface })}
            </span>
          </span>
          <span className="text-caption leading-[1.55] text-muted-foreground">
            {t('tiers.listing.area')}
          </span>
          <span className="flex flex-wrap gap-1.5">
            {kind === 'plain' ? (
              <ListingChip className="border-[1.5px] border-dashed border-border-declared font-bold text-muted-foreground">
                {t('tiers.plain.declared')}
              </ListingChip>
            ) : (
              <ListingChip className="bg-zone-chip font-extrabold text-info">
                <MapPinIcon className="size-3.5" />
                {zone}
              </ListingChip>
            )}
            {kind === 'physical' ? (
              <ListingChip className="bg-primary font-extrabold text-cta">
                <BadgeCheckIcon className="size-3.5" />
                {condition}
              </ListingChip>
            ) : null}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 px-1.5">
        <span className="flex min-h-10 items-center justify-between gap-2.5">
          <TierName kind={kind} />
          <TierPrice kind={kind} />
        </span>
        <span className={cn('text-[15px] leading-[1.45]', style.text)}>
          {t(`tiers.${tierKey(kind)}.text`)}
        </span>
        <span
          role="img"
          aria-label={t('tiers.trustLevel', { level: style.level, total: TRUST_LEVELS })}
          className="flex items-center gap-2.5"
        >
          <span
            aria-hidden="true"
            className={cn(
              'text-meta leading-[1.55] font-extrabold tracking-[0.06em] uppercase',
              style.text,
            )}
          >
            {t('tiers.trust')}
          </span>
          <span aria-hidden="true" className="grid flex-1 grid-cols-3 gap-1">
            {Array.from({ length: TRUST_LEVELS }, (_, index) => (
              <span
                key={index}
                className={cn('h-1.5 rounded-full', index < style.level ? style.bar : style.barOff)}
              />
            ))}
          </span>
        </span>
        {kind === 'plain' ? null : <TierLink kind={kind} />}
      </div>
    </li>
  );
}

function tierKey(kind: TierKind) {
  return kind === 'smartcheck' ? 'smartCheck' : kind;
}

function TierName({ kind }: { kind: TierKind }) {
  const { t } = useTranslation('publish');

  if (kind === 'plain') {
    return (
      <strong className="text-xl leading-[1.55] font-bold tracking-[-0.02em]">
        {t('tiers.plain.name')}
      </strong>
    );
  }
  if (kind === 'smartcheck') {
    return <Logo product="smartcheck" tone="inverse" size="md" className="text-[21px]" />;
  }
  return <Logo product="physical" surface="accent" size="md" className="text-[21px]" />;
}

function TierPrice({ kind }: { kind: TierKind }) {
  const { t } = useTranslation('publish');

  if (kind === 'plain') {
    return (
      <span className="text-[28px] leading-none font-extrabold tracking-[-0.04em]">
        {t('tiers.plain.price')}
      </span>
    );
  }
  const service = kind === 'smartcheck' ? SERVICE_PRICES.smartCheck : SERVICE_PRICES.physical;
  return (
    <SplitPrice
      amount={service.amount}
      currency={service.currency}
      className="text-[28px] leading-none font-extrabold tracking-[-0.04em]"
      currencyClassName="text-small font-bold tracking-normal"
    />
  );
}

function TierLink({ kind }: { kind: 'smartcheck' | 'physical' }) {
  const { t } = useTranslation('publish');
  const isSmartCheck = kind === 'smartcheck';

  return (
    <Link
      to="/"
      hash={isSmartCheck ? HOME_SECTION.smartCheck : HOME_SECTION.physical}
      className={cn(
        'flex min-h-11 items-center justify-between gap-2 rounded-md px-3.5 text-small font-extrabold transition-colors duration-(--duration-fast) focus-visible:ring-3 focus-visible:outline-none',
        isSmartCheck
          ? 'bg-card text-info hover:bg-info-surface focus-visible:ring-focus-inverse'
          : 'bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring',
      )}
    >
      {isSmartCheck ? t('tiers.smartCheck.more') : t('tiers.physical.more')}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

function ProductChip({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full pr-2.5 pl-1 text-caption font-extrabold text-on-inverse shadow-tier-chip',
        className,
      )}
    >
      {children}
    </span>
  );
}

function ListingChip({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={cn('inline-flex h-7 items-center gap-1 rounded-[6px] px-2.5 text-meta', className)}
    >
      {children}
    </span>
  );
}
