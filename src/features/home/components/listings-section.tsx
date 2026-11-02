import { getRouteApi, Link } from '@tanstack/react-router';
import { cva } from 'class-variance-authority';
import { ArrowRightIcon, FileCheckIcon, PlusIcon, type LucideIcon } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { HOME_SECTION, type HomeSectionId } from '@/components/layout/site-navigation';
import { DEFAULT_TRANSACTION } from '@/config/home-search';
import { ListingsBoard } from '@/features/listings';
import { useBrandNames } from '../hooks/use-brand-names';
import { SectionTitle } from './section-title';

const routeApi = getRouteApi('/_site/');

const cardIconVariants = cva('grid size-12 shrink-0 place-items-center rounded-icon', {
  variants: {
    tone: {
      dark: 'bg-primary text-cta',
      dashed: 'border border-dashed border-trust-none-border text-brand',
    },
  },
});

const LINK_CARDS = [
  { key: 'included', hash: HOME_SECTION.listingIncluded, icon: FileCheckIcon, tone: 'dark' },
  { key: 'self', hash: HOME_SECTION.questions, icon: PlusIcon, tone: 'dashed' },
] as const satisfies readonly {
  key: string;
  hash: HomeSectionId;
  icon: LucideIcon;
  tone: 'dark' | 'dashed';
}[];

export function ListingsSection() {
  const { t } = useTranslation(['home', 'common']);
  const brands = useBrandNames();
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
          <SectionTitle
            id="listings-title"
            size="listings"
            className="text-brand"
            accentClassName="text-muted-foreground"
            lead={t('listings.titleLead')}
            accent={
              <Trans
                t={t}
                i18nKey="listings.titleAccent"
                components={{ v: <span className="marker-cta text-brand" /> }}
              />
            }
          />
          <div className="flex flex-col gap-4.5">
            <p className="text-lg leading-[1.65] text-ink-soft">
              <Trans
                t={t}
                i18nKey="listings.lead"
                values={brands}
                components={{ strong: <strong className="font-bold text-brand" /> }}
              />
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
                {t('common:trust.noneShort')}
              </li>
            </ul>
          </div>
        </div>
        <ListingsBoard
          transaction={search.transaction ?? DEFAULT_TRANSACTION}
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
                className="group flex items-center gap-4 rounded-xl border border-border-subtle bg-card px-5.5 py-5 shadow-link-card transition-shadow duration-(--duration-fast) hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                <span className={cardIconVariants({ tone: card.tone })}>
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="flex flex-1 flex-col gap-1">
                  <span className="text-meta font-extrabold text-muted-foreground">
                    {t(`listings.cards.${card.key}.eyebrow`, brands)}
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
