import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, BadgeCheckIcon, MapPinIcon, Rotate3dIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { HOME_SECTION, PUBLISH_SECTION } from '@/components/layout/site-navigation';
import { SERVICE_PRICES } from '@/config/pricing';
import { SplitPrice } from '@/components/property/split-price';
import { Button } from '@/components/ui/button';
import { formatNumber, formatPrice } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { TIER_LISTING, TIER_PHOTO } from '../publish.example';

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
            className="text-[clamp(36px,4.2vw,60px)] leading-[1.04] font-extrabold tracking-section text-on-inverse"
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
        <p className="text-center text-small leading-copy text-on-inverse-mist">
          <Trans
            t={t}
            i18nKey="tiers.note"
            components={{ muted: <span className="opacity-80" /> }}
          />
        </p>
      </div>
    </section>
  );
}

type TierCardProps = {
  kind: TierKind;
};

function TierCard({ kind }: TierCardProps) {
  const { t } = useTranslation(['publish', 'common']);
  const style = TIER_STYLES[kind];
  const zone = t('tiers.smartCheck.zone', { score: TIER_LISTING.zoneScore });
  const condition = t('tiers.physical.condition', {
    score: formatNumber(TIER_LISTING.conditionScore, { minimumFractionDigits: 1 }),
  });

  return (
    <li className={cn('flex flex-col gap-4 rounded-[22px] px-4 pt-4 pb-5', style.card)}>
      <div aria-hidden="true" className="overflow-hidden rounded-tile bg-card shadow-tier-photo">
        <div className="relative aspect-16/10 max-h-55 bg-surface-physical-col w1059:max-h-none">
          <img
            src={TIER_PHOTO.src}
            alt=""
            width={TIER_PHOTO.width}
            height={TIER_PHOTO.height}
            loading="lazy"
            decoding="async"
            className={cn('size-full object-cover', kind === 'plain' && 'saturate-55')}
          />
          <span className="absolute top-2.5 right-2.5 left-2.5 flex flex-wrap gap-1.5">
            {kind === 'plain' ? (
              <span className="inline-flex h-7 items-center rounded-full bg-card/92 px-2.5 text-meta font-extrabold text-muted-foreground">
                {t('common:trust.noneShort')}
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
            <strong className="text-[19px] leading-copy font-bold tracking-[-0.02em] text-foreground tabular-nums">
              {formatPrice(TIER_LISTING.price, TIER_LISTING.currency)}
            </strong>
            <span className="text-caption leading-copy text-muted-foreground">
              {t('tiers.listing.meta', { count: TIER_LISTING.rooms, area: TIER_LISTING.surface })}
            </span>
          </span>
          <span className="text-caption leading-copy text-muted-foreground">
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
        <span className={cn('text-body-sm leading-compact', style.text)}>
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
              'text-meta leading-copy font-extrabold tracking-eyebrow uppercase',
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

type TierNameProps = {
  kind: TierKind;
};

function TierName({ kind }: TierNameProps) {
  const { t } = useTranslation('publish');

  if (kind === 'plain') {
    return (
      <strong className="text-xl leading-copy font-bold tracking-[-0.02em]">
        {t('tiers.plain.name')}
      </strong>
    );
  }
  if (kind === 'smartcheck') {
    return <Logo product="smartcheck" tone="inverse" size="md" className="text-title-xs" />;
  }
  return <Logo product="physical" surface="accent" size="md" className="text-title-xs" />;
}

type TierPriceProps = {
  kind: TierKind;
};

function TierPrice({ kind }: TierPriceProps) {
  const { t } = useTranslation('publish');

  if (kind === 'plain') {
    return (
      <span className="text-title-sm leading-none font-extrabold tracking-title">
        {t('tiers.plain.price')}
      </span>
    );
  }
  const service = kind === 'smartcheck' ? SERVICE_PRICES.smartCheck : SERVICE_PRICES.physical;
  return (
    <SplitPrice
      amount={service.amount}
      currency={service.currency}
      className="text-title-sm leading-none font-extrabold tracking-title"
      currencyClassName="text-small font-bold tracking-normal"
    />
  );
}

type TierLinkKind = Exclude<TierKind, 'plain'>;

const TIER_LINKS = {
  smartcheck: {
    variant: 'inverseInfo',
    hash: HOME_SECTION.smartCheck,
    label: 'tiers.smartCheck.more',
    className: '',
  },
  physical: {
    variant: 'default',
    hash: HOME_SECTION.physical,
    label: 'tiers.physical.more',
    className: 'focus-visible:ring-offset-cta',
  },
} as const satisfies Record<
  TierLinkKind,
  { variant: 'inverseInfo' | 'default'; hash: string; label: string; className: string }
>;

type TierLinkProps = {
  kind: TierLinkKind;
};

function TierLink({ kind }: TierLinkProps) {
  const { t } = useTranslation('publish');
  const link = TIER_LINKS[kind];

  return (
    <Button
      asChild
      variant={link.variant}
      className={cn(
        'h-auto min-h-11 w-full justify-between px-3.5 text-small font-extrabold [&_svg]:size-4',
        link.className,
      )}
    >
      <Link to="/" hash={link.hash}>
        {t(link.label)}
        <ArrowRightIcon aria-hidden />
      </Link>
    </Button>
  );
}

type ProductChipProps = {
  className: string;
  children: ReactNode;
};

function ProductChip({ className, children }: ProductChipProps) {
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

type ListingChipProps = {
  className: string;
  children: ReactNode;
};

function ListingChip({ className, children }: ListingChipProps) {
  return (
    <span
      className={cn('inline-flex h-7 items-center gap-1 rounded-[6px] px-2.5 text-meta', className)}
    >
      {children}
    </span>
  );
}
