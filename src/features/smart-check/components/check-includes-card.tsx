import {
  ChartNoAxesCombinedIcon,
  FileDownIcon,
  FootprintsIcon,
  MapIcon,
  MessageCircleQuestionIcon,
  ShieldIcon,
  SproutIcon,
  TramFrontIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { CHECK_CITIES, CHECK_PRICE_RON } from '../check.utils';

type IncludedItem = {
  key: 'score' | 'transit' | 'fifteen' | 'green' | 'environment' | 'market' | 'questions' | 'share';
  icon: LucideIcon;
  tile: string;
};

const INCLUDED_ITEMS: readonly IncludedItem[] = [
  { key: 'score', icon: MapIcon, tile: 'bg-category-education-surface text-category-education' },
  {
    key: 'transit',
    icon: TramFrontIcon,
    tile: 'bg-category-transport-surface text-category-transport-strong',
  },
  {
    key: 'fifteen',
    icon: FootprintsIcon,
    tile: 'bg-category-shopping-surface text-category-shopping',
  },
  { key: 'green', icon: SproutIcon, tile: 'bg-category-green-surface text-category-green' },
  { key: 'environment', icon: ShieldIcon, tile: 'bg-category-safety-surface text-category-safety' },
  {
    key: 'market',
    icon: ChartNoAxesCombinedIcon,
    tile: 'bg-category-education-surface text-category-education',
  },
  {
    key: 'questions',
    icon: MessageCircleQuestionIcon,
    tile: 'bg-category-green-surface text-category-green',
  },
  { key: 'share', icon: FileDownIcon, tile: 'bg-category-safety-surface text-category-safety' },
];

export function CheckIncludesCard() {
  const { t } = useTranslation('smartCheck');

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-labelledby="check-includes-title"
        className="rounded-panel border-8 border-category-education-fill bg-card p-5 shadow-card-soft w767:p-6"
      >
        <h2 id="check-includes-title" className="text-h4 font-extrabold">
          {t('check.includes.title', { price: formatPrice(CHECK_PRICE_RON, 'RON') })}
        </h2>
        <ul className="mt-3.5 flex flex-col gap-3">
          {INCLUDED_ITEMS.map(({ key, icon: Icon, tile }) => (
            <li key={key} className="flex items-start gap-3 text-body-sm leading-snug">
              <span
                aria-hidden
                className={cn('grid size-6.5 shrink-0 place-items-center rounded-note', tile)}
              >
                <Icon className="size-4" />
              </span>
              {t(`check.includes.items.${key}`)}
            </li>
          ))}
        </ul>
        <p className="mt-3.5 text-caption text-muted-foreground">{t('check.includes.note')}</p>
      </section>
      <section
        aria-labelledby="check-cities-title"
        className="rounded-lg border border-card bg-card p-5 shadow-card-soft"
      >
        <h2 id="check-cities-title" className="flex items-center gap-2 text-body-sm font-extrabold">
          <MapIcon aria-hidden className="size-4" />
          {t('check.includes.citiesTitle')}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {CHECK_CITIES.map((city) => (
            <li
              key={city.slug}
              className="rounded-full bg-category-education-surface px-2.5 py-1 text-caption font-bold text-info-ink"
            >
              {city.name}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
