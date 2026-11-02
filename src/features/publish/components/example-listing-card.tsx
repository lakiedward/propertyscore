import {
  BuildingIcon,
  CalendarIcon,
  CircleCheckIcon,
  DoorOpenIcon,
  HeartIcon,
  MapPinIcon,
  PhoneIcon,
  RulerIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import heroImage from '@/assets/home/hero-living.webp';
import { formatPercent, formatPrice } from '@/i18n/format';
import { HERO_LISTING, HERO_PRICE_PER_SQUARE_METRE, PHOTO_TILES } from '../publish.example';

export function ExampleListingCard() {
  const { t } = useTranslation('publish');
  const facts = [
    {
      key: 'surface',
      icon: <RulerIcon />,
      label: t('example.surface', { value: HERO_LISTING.surface }),
    },
    {
      key: 'rooms',
      icon: <DoorOpenIcon />,
      label: t('example.rooms', { count: HERO_LISTING.rooms }),
    },
    {
      key: 'floor',
      icon: <BuildingIcon />,
      label: t('example.floorShort', {
        floor: HERO_LISTING.floor,
        floors: HERO_LISTING.floors,
      }),
    },
    { key: 'year', icon: <CalendarIcon />, label: String(HERO_LISTING.year) },
  ];

  return (
    <figure className="relative isolate m-0 px-2 pt-6 pb-26 w767:px-8 w767:pt-9 w767:pb-25">
      <figcaption className="sr-only">{t('hero.card.summary')}</figcaption>
      <div aria-hidden="true" className="contents">
        <div className="absolute top-0 right-0 bottom-14 left-7 -z-10 rounded-[36px] bg-category-health-fill w767:bottom-13 w767:left-22" />
        <div className="overflow-hidden rounded-photo bg-card shadow-listing-hero">
          <div className="relative aspect-4/3 bg-surface-alt w767:aspect-16/10">
            <img
              src={heroImage}
              alt=""
              width={1672}
              height={941}
              decoding="async"
              className="absolute inset-0 size-full object-cover"
            />
            <span className="absolute top-4 left-4 rounded-md bg-primary px-3 py-1.75 text-caption font-extrabold text-primary-foreground">
              {t('hero.card.transaction')}
            </span>
            <span className="absolute right-4 bottom-4 grid size-11 place-items-center rounded-full bg-card text-category-health shadow-heart">
              <HeartIcon className="size-5" />
            </span>
            <span className="absolute bottom-4 left-4 flex gap-1.5">
              <Thumb>
                <img
                  src={PHOTO_TILES.bedroom.src}
                  alt=""
                  width={PHOTO_TILES.bedroom.width}
                  height={PHOTO_TILES.bedroom.height}
                  decoding="async"
                  className="size-full object-cover"
                />
              </Thumb>
              <Thumb>
                <img
                  src={PHOTO_TILES.window.src}
                  alt=""
                  width={PHOTO_TILES.window.width}
                  height={PHOTO_TILES.window.height}
                  decoding="async"
                  className="size-full object-cover"
                />
              </Thumb>
              <Thumb>
                <span className="grid size-full place-items-center bg-foreground/72 text-caption font-extrabold text-primary-foreground tabular-nums">
                  {t('hero.card.morePhotos', { count: HERO_LISTING.morePhotos })}
                </span>
              </Thumb>
            </span>
          </div>
          <div className="flex flex-col gap-3 px-5.5 pt-5 pb-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <strong className="text-title-sm leading-none font-extrabold tracking-section text-foreground tabular-nums w767:text-[34px]">
                  {formatPrice(HERO_LISTING.price, HERO_LISTING.currency)}
                </strong>
                <strong className="text-lg leading-[1.3] font-bold text-foreground">
                  {t('example.title')}
                </strong>
                <span className="flex items-center gap-1 text-small leading-copy text-muted-foreground">
                  <MapPinIcon className="size-3.5 shrink-0" />
                  {t('hero.card.area')}
                </span>
              </div>
              <span className="shrink-0 text-small leading-copy text-muted-foreground tabular-nums">
                {t('hero.card.pricePerSqm', {
                  price: formatPrice(HERO_PRICE_PER_SQUARE_METRE, HERO_LISTING.currency),
                })}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {facts.map((fact) => (
                <FactChip key={fact.key} icon={fact.icon} label={fact.label} />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2.5 border-t border-border-subtle pt-3">
              <span className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-full bg-primary text-caption font-extrabold text-primary-foreground">
                  {t('hero.card.ownerInitials')}
                </span>
                <span className="flex flex-col">
                  <strong className="text-small leading-tight font-bold text-foreground">
                    {t('hero.card.ownerName')}
                  </strong>
                  <span className="text-meta leading-tight text-muted-foreground">
                    {t('hero.card.ownerRole')}
                  </span>
                </span>
              </span>
              <span className="inline-flex h-9 items-center gap-1.5 rounded-md border-[1.5px] border-brand px-3 text-caption font-extrabold text-brand">
                <PhoneIcon className="size-3.5" />
                {t('hero.card.showPhone')}
              </span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 left-0 flex w-57.5 flex-col gap-2.5 rounded-[16px] bg-card p-4 shadow-progress w767:bottom-3 w767:-left-7 w767:w-67.5">
          <span className="flex justify-between text-meta leading-copy font-extrabold">
            <span className="text-muted-foreground">{t('hero.card.progress')}</span>
            <span className="text-brand tabular-nums">
              {formatPercent(HERO_LISTING.progress / 100)}
            </span>
          </span>
          <span className="block h-1.5 rounded-full bg-secondary">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${String(HERO_LISTING.progress)}%` }}
            />
          </span>
          <span className="flex items-center gap-2.5">
            <span className="grid size-7.5 shrink-0 place-items-center rounded-full bg-step-leaf-surface text-step-leaf-ink">
              <MapPinIcon className="size-3.5" />
            </span>
            <span className="flex flex-col text-small leading-tight font-bold text-foreground">
              {t('hero.card.pinTitle')}
              <span className="text-meta leading-tight font-semibold text-muted-foreground">
                {t('hero.card.pinText')}
              </span>
            </span>
          </span>
        </div>
        <div className="absolute top-0 right-0 flex items-center gap-2 rounded-full bg-primary px-4 py-2.75 text-small leading-copy font-extrabold text-primary-foreground shadow-published w767:top-2 w767:right-2">
          <CircleCheckIcon className="size-4.5 text-cta" />
          {t('hero.card.published')}
        </div>
      </div>
    </figure>
  );
}

type ThumbProps = {
  children: ReactNode;
};

function Thumb({ children }: ThumbProps) {
  return (
    <span className="block h-10.5 w-14 overflow-hidden rounded-md border-2 border-card">
      {children}
    </span>
  );
}

type FactChipProps = {
  icon: ReactNode;
  label: string;
};

function FactChip({ icon, label }: FactChipProps) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-background px-3 text-caption font-bold text-foreground [&_svg]:size-3.5">
      {icon}
      {label}
    </span>
  );
}
