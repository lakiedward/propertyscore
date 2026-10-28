import { getRouteApi, Link } from '@tanstack/react-router';
import { ArrowRightIcon, FileCheckIcon, PlusIcon, type LucideIcon } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { HOME_SECTION, type HomeSectionId } from '@/components/layout/site-navigation';
import { ListingsBoard } from '@/features/listings';
import { cn } from '@/lib/utils';

const routeApi = getRouteApi('/_site/');

const LINK_CARDS: readonly {
  key: 'included' | 'self';
  hash: HomeSectionId;
  icon: LucideIcon;
  isDark: boolean;
}[] = [
  { key: 'included', hash: HOME_SECTION.listingIncluded, icon: FileCheckIcon, isDark: true },
  { key: 'self', hash: HOME_SECTION.questions, icon: PlusIcon, isDark: false },
];

export function ListingsSection() {
  const { t } = useTranslation(['home', 'listings']);
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  return (
    <section
      id={HOME_SECTION.listings}
      aria-labelledby="listings-title"
      className="bg-background py-18 w960:py-24"
    >
      <div className="page-wrap flex flex-col">
        <div className="mb-8 grid grid-cols-1 gap-x-18 gap-y-7 w960:grid-cols-[1.08fr_1fr]">
          <h2
            id="listings-title"
            className="text-[clamp(34px,3.6vw,54px)] leading-[1.08] font-[740] tracking-[-0.035em] text-balance text-brand"
          >
            <span className="block">{t('listings.titleLead')}</span>
            <span className="block text-muted-foreground">
              <Trans
                t={t}
                i18nKey="listings.titleAccent"
                components={{ v: <span className="marker-cta text-brand" /> }}
              />
            </span>
          </h2>
          <div className="flex flex-col gap-4.5">
            <p className="text-lg leading-[1.65] text-ink-soft">
              <strong className="font-bold text-brand">{t('listings.leadStrong')}</strong>{' '}
              {t('listings.lead')}
            </p>
            <ul
              aria-label={t('listings.legendLabel')}
              className="flex flex-wrap items-center gap-2"
            >
              <li className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary pr-3 pl-1.5">
                <BrandMark product="physical" size={20} />
                <Logo product="physical" tone="inverse" size="2xs" hasMark={false} />
              </li>
              <li className="inline-flex h-8 items-center gap-1.5 rounded-full bg-info pr-3 pl-1.5">
                <BrandMark product="smartcheck" tone="inverse" size={20} />
                <Logo product="smartcheck" tone="inverse" size="2xs" hasMark={false} />
              </li>
              <li className="inline-flex h-8 items-center rounded-full border border-dashed border-trust-none-border px-3 text-meta font-extrabold text-muted-foreground">
                {t('listings:verification.none')}
              </li>
            </ul>
          </div>
        </div>
        <ListingsBoard
          transaction={search.transaction ?? 'sale'}
          onTransactionChange={(transaction) => {
            void navigate({
              search: (previous) => ({ ...previous, transaction }),
              replace: true,
              resetScroll: false,
            });
          }}
        />
        <div className="mt-5 grid grid-cols-1 gap-4 w860:grid-cols-2">
          {LINK_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.key}
                to="/"
                hash={card.hash}
                className="group flex items-center gap-4 rounded-xl border border-border-subtle bg-card px-5.5 py-5 shadow-link-card transition-shadow duration-(--duration-fast) hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span
                  className={cn(
                    'grid size-12 shrink-0 place-items-center rounded-icon',
                    card.isDark
                      ? 'bg-primary text-cta'
                      : 'border border-dashed border-trust-none-border text-brand',
                  )}
                >
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="flex flex-1 flex-col gap-1">
                  <span className="text-meta font-extrabold text-muted-foreground">
                    {t(`listings.cards.${card.key}.eyebrow`)}
                  </span>
                  <span className="text-lg font-extrabold tracking-[-0.01em] text-brand">
                    {t(`listings.cards.${card.key}.title`)}
                  </span>
                  <span className="text-small text-muted-foreground">
                    {t(`listings.cards.${card.key}.text`)}
                  </span>
                </span>
                <ArrowRightIcon
                  aria-hidden
                  className="mt-1 size-5 text-brand transition-transform duration-(--duration-fast) group-hover:translate-x-1"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
