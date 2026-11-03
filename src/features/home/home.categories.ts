import {
  BusIcon,
  EuroIcon,
  FootprintsIcon,
  GraduationCapIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  StethoscopeIcon,
  TreesIcon,
  type LucideIcon,
} from 'lucide-react';

export const HOME_CATEGORIES = [
  'safety',
  'city',
  'transport',
  'green',
  'education',
  'health',
  'shopping',
] as const;

export type HomeCategory = (typeof HOME_CATEGORIES)[number];

type CategoryStyle = {
  tile: string;
  dot: string;
  stroke: string;
  fill: string;
  token: `--category-${HomeCategory}`;
};

export const CATEGORY_STYLE = {
  safety: {
    tile: 'bg-category-safety-surface text-category-safety',
    dot: 'bg-category-safety',
    stroke: 'stroke-category-safety',
    fill: 'fill-category-safety',
    token: '--category-safety',
  },
  city: {
    tile: 'bg-category-city-surface text-category-city',
    dot: 'bg-category-city',
    stroke: 'stroke-category-city',
    fill: 'fill-category-city',
    token: '--category-city',
  },
  transport: {
    tile: 'bg-category-transport-surface text-category-transport',
    dot: 'bg-category-transport',
    stroke: 'stroke-category-transport',
    fill: 'fill-category-transport',
    token: '--category-transport',
  },
  green: {
    tile: 'bg-category-green-surface text-category-green',
    dot: 'bg-category-green',
    stroke: 'stroke-category-green',
    fill: 'fill-category-green',
    token: '--category-green',
  },
  education: {
    tile: 'bg-category-education-surface text-category-education',
    dot: 'bg-category-education',
    stroke: 'stroke-category-education',
    fill: 'fill-category-education',
    token: '--category-education',
  },
  health: {
    tile: 'bg-category-health-surface text-category-health',
    dot: 'bg-category-health',
    stroke: 'stroke-category-health',
    fill: 'fill-category-health',
    token: '--category-health',
  },
  shopping: {
    tile: 'bg-category-shopping-surface text-category-shopping',
    dot: 'bg-category-shopping',
    stroke: 'stroke-category-shopping',
    fill: 'fill-category-shopping',
    token: '--category-shopping',
  },
} as const satisfies Record<HomeCategory, CategoryStyle>;

const HUE_CATEGORY = {
  sun: 'transport',
  sky: 'education',
  coral: 'health',
  berry: 'shopping',
  leaf: 'green',
  aqua: 'safety',
  slate: 'city',
} as const satisfies Record<string, HomeCategory>;

export type HomeHue = keyof typeof HUE_CATEGORY;

export function hueStyle(hue: HomeHue): CategoryStyle {
  return CATEGORY_STYLE[HUE_CATEGORY[hue]];
}

export const CATEGORY_ICON = {
  safety: ShieldCheckIcon,
  city: FootprintsIcon,
  transport: BusIcon,
  green: TreesIcon,
  education: GraduationCapIcon,
  health: StethoscopeIcon,
  shopping: ShoppingBagIcon,
} as const satisfies Record<HomeCategory, LucideIcon>;

export const ZONE_CHAPTERS = [
  'education',
  'health',
  'transport',
  'shopping',
  'green',
  'safety',
] as const satisfies readonly HomeCategory[];

export const PRICES_CATEGORY = 'prices' as const;
export const PRICES_ICON = EuroIcon;
export const PRICES_HUE: HomeCategory = 'city';
