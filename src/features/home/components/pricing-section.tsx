import { Link } from '@tanstack/react-router';
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  CircleDollarSignIcon,
  MapIcon,
  MessageSquareIcon,
  SquareCheckIcon,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { ProductTag } from '@/components/brand/product-tag';
import { HOME_SECTION, type HomeSectionId } from '@/components/layout/site-navigation';
import { PricingComparison, type ComparisonValue } from '@/components/property/pricing-comparison';
import { SplitPrice } from '@/components/property/split-price';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice, type Currency } from '@/i18n/format';
import { cn } from '@/lib/utils';

const COMPARISON_VALUES: readonly (readonly [ComparisonValue, ComparisonValue])[] = [
  ['yes', 'yes'],
  ['yes', 'no'],
  ['yes', 'no'],
  ['yes', 'no'],
  ['yes', 'partial'],
];
const TOPIC_ICONS: readonly LucideIcon[] = [
  BookOpenIcon,
  SquareCheckIcon,
  CircleDollarSignIcon,
  MapIcon,
];
const CONSULTATION_LENGTHS = ['short', 'long'] as const;
const PHYSICAL_COLUMN = 'physical';
const SMART_CHECK_COLUMN = 'smartCheck';

export function PricingSection() {
  const { t } = useTranslation('home');
  const physicalPrice = formatPrice(
    SERVICE_PRICES.physical.amount,
    SERVICE_PRICES.physical.currency,
  );
  const smartCheckPrice = formatPrice(
    SERVICE_PRICES.smartCheck.amount,
    SERVICE_PRICES.smartCheck.currency,
  );
  const rows = t('pricing.comparison.rows', { returnObjects: true });
  const topics = t('pricing.consultation.topics', { returnObjects: true });

  return (
    <section
      id={HOME_SECTION.pricing}
      aria-labelledby="pricing-title"
      className="bg-background py-13.75 w520:py-17.5 w820:py-24"
    >
      <div className="page-wrap flex flex-col">
        <div className="mb-7.5 max-w-212.5">
          <h2
            id="pricing-title"
            className="my-3.5 text-[clamp(34px,4vw,58px)] leading-[1.1] font-[740] tracking-[-0.04em] text-foreground"
          >
            <span className="block">{t('pricing.titleLead')}</span>
            <span className="block text-muted-foreground">
              <Trans
                t={t}
                i18nKey="pricing.titleAccent"
                components={{
                  area: <span className="marker-info text-info" />,
                  home: <span className="marker-cta text-brand" />,
                }}
              />
            </span>
          </h2>
          <p className="max-w-170 text-body text-muted-foreground w520:text-lead w520:leading-[1.6]">
            <strong className="font-bold text-foreground">{t('pricing.leadStrong')}</strong>{' '}
            {t('pricing.lead')}
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
            summary={t('pricing.physical.summary')}
            badge={
              <span className="inline-flex h-10 w-fit flex-wrap items-center gap-2 rounded-full bg-on-inverse/10 pr-3.5 pl-2 text-small font-bold text-on-inverse">
                <BrandMark product="smartcheck" tone="inverse" size={24} />
                {t('pricing.physical.included')}
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

        <div className="mt-3.75 flex flex-col rounded-xl border border-border bg-card p-7">
          <h3 className="text-h3 font-extrabold tracking-[-0.025em] text-brand">
            {t('pricing.comparison.title')}
          </h3>
          <p className="mt-1.5 mb-5.5 max-w-160 text-body text-muted-foreground">
            <Trans
              t={t}
              i18nKey="pricing.comparison.intro"
              components={{ strong: <strong className="font-bold text-foreground" /> }}
            />
          </p>
          <PricingComparison
            caption={t('pricing.comparison.label')}
            featureHeader={t('pricing.comparison.featureColumn')}
            valueLabels={{
              yes: t('pricing.comparison.values.yes'),
              no: t('pricing.comparison.values.no'),
              partial: t('pricing.comparison.values.partial'),
            }}
            columns={[
              {
                key: PHYSICAL_COLUMN,
                tone: 'physical',
                header: (
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <ProductTag product="physical" />
                    <span className="text-label whitespace-nowrap text-brand">{physicalPrice}</span>
                  </span>
                ),
              },
              {
                key: SMART_CHECK_COLUMN,
                tone: 'online',
                header: (
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <ProductTag product="smartcheck" />
                    <span className="text-label whitespace-nowrap text-info">
                      {smartCheckPrice}
                    </span>
                  </span>
                ),
              },
            ]}
            rows={rows.map((row, index) => {
              const [physicalValue, smartCheckValue] = COMPARISON_VALUES[index] ?? ['no', 'no'];
              return {
                key: row.label,
                label: row.label,
                cells: [
                  { value: physicalValue, text: row.physical },
                  { value: smartCheckValue, text: row.smartCheck },
                ],
              };
            })}
          />
        </div>

        <div className="mt-7 grid grid-cols-1 items-center gap-10 rounded-xl bg-surface-aqua p-6 w860:p-10 w1080:grid-cols-[0.91fr_1fr]">
          <div className="flex flex-col items-start gap-2.5">
            <p className="flex items-center gap-1.5 text-meta font-extrabold tracking-[0.08em] text-aqua-ink uppercase">
              <MessageSquareIcon aria-hidden className="size-4" />
              {t('pricing.consultation.eyebrow')}
            </p>
            <h3 className="text-[clamp(24px,2.4vw,30px)] leading-[1.15] font-extrabold tracking-[-0.025em] text-balance text-brand">
              <span className="block">{t('pricing.consultation.titleLead')}</span>
              <span className="block text-aqua-strong">
                {t('pricing.consultation.titleAccent')}
              </span>
            </h3>
            <p className="text-body text-muted-foreground">{t('pricing.consultation.text')}</p>
            <ul className="mt-1.5 mb-2 flex flex-wrap gap-2">
              {CONSULTATION_LENGTHS.map((key) => (
                <li
                  key={key}
                  className="rounded-full bg-card px-3.5 py-1.5 text-small text-aqua-ink"
                >
                  <Trans
                    t={t}
                    i18nKey={`pricing.consultation.${key}`}
                    components={{ strong: <strong className="font-bold" /> }}
                  />
                </li>
              ))}
            </ul>
            <Link
              to="/"
              hash={HOME_SECTION.pricing}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-md bg-primary px-5 text-label font-extrabold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none sm:w-auto"
            >
              {t('pricing.consultation.cta')}
              <ArrowRightIcon aria-hidden className="size-4" />
            </Link>
          </div>
          <div className="rounded-xl bg-card px-6 py-2 shadow-aqua">
            <p className="pt-4 pb-1.5 text-meta font-extrabold tracking-[0.08em] text-muted-foreground uppercase">
              {t('pricing.consultation.topicsTitle')}
            </p>
            <ul>
              {topics.map((topic, index) => {
                const Icon = TOPIC_ICONS[index] ?? BookOpenIcon;
                return (
                  <li
                    key={topic.title}
                    className="flex items-center gap-3.5 border-t border-border-subtle py-4.5 first:border-t-0"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-icon bg-surface-aqua text-aqua-ink">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-label font-extrabold text-brand">{topic.title}</span>
                      <span className="text-small text-muted-foreground">{topic.text}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <p className="mt-4 max-w-copy text-meta text-muted-foreground">{t('pricing.finePrint')}</p>
      </div>
    </section>
  );
}

type PriceCardProps = {
  tone: 'physical' | 'smartcheck';
  brand: ReactNode;
  amount: number;
  currency: Currency;
  summary: string;
  badge: ReactNode;
  features: readonly { title: string; text: string }[];
  cta: string;
  ctaHash: HomeSectionId;
  secondary: string;
  secondaryHash: HomeSectionId;
};

function PriceCard({
  tone,
  brand,
  amount,
  currency,
  summary,
  badge,
  features,
  cta,
  ctaHash,
  secondary,
  secondaryHash,
}: PriceCardProps) {
  const isPhysical = tone === 'physical';
  return (
    <article
      className={cn(
        'flex flex-col gap-4.5 rounded-2xl p-6 text-on-inverse w520:p-10',
        isPhysical ? 'bg-primary shadow-price' : 'bg-info',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {brand}
        <SplitPrice
          amount={amount}
          currency={currency}
          className="text-[40px] leading-none font-extrabold tracking-[-0.045em] text-cta w520:text-[56px]"
          currencyClassName="text-lead-sm font-extrabold tracking-normal text-on-inverse"
        />
      </div>
      <p className="text-body text-on-inverse-bright w520:text-lead-sm">{summary}</p>
      {badge}
      <ul className="flex flex-col gap-3.5 border-t border-on-inverse/16 pt-4.5">
        {features.map((feature) => (
          <li key={feature.title} className="flex gap-3">
            <CheckIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-cta" />
            <span className="flex flex-col">
              <span className="text-body font-extrabold">{feature.title}</span>
              <span className="text-small text-on-inverse-muted">{feature.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-2">
        <Link
          to="/"
          hash={ctaHash}
          className={cn(
            'inline-flex min-h-12.5 items-center gap-3 rounded-full py-0 pr-2 pl-5 text-label font-extrabold transition-colors focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none',
            isPhysical ? 'bg-cta text-brand hover:bg-cta-hover' : 'bg-card text-info',
          )}
        >
          {cta}
          <span
            aria-hidden="true"
            className={cn(
              'grid size-9 place-items-center rounded-full',
              isPhysical ? 'bg-primary text-cta' : 'bg-info text-on-inverse',
            )}
          >
            <ArrowRightIcon className="size-4" />
          </span>
        </Link>
        <Link
          to="/"
          hash={secondaryHash}
          className="text-small font-bold text-on-inverse underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none"
        >
          {secondary}
        </Link>
      </div>
    </article>
  );
}
