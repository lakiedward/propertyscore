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

export type CategoryHue =
  'safety' | 'city' | 'transport' | 'green' | 'education' | 'health' | 'shopping';

export const CATEGORY_TILE_CLASS: Readonly<Record<CategoryHue, string>> = {
  safety: 'bg-category-safety-surface text-category-safety',
  city: 'bg-category-city-surface text-category-city',
  transport: 'bg-category-transport-surface text-category-transport',
  green: 'bg-category-green-surface text-category-green',
  education: 'bg-category-education-surface text-category-education',
  health: 'bg-category-health-surface text-category-health',
  shopping: 'bg-category-shopping-surface text-category-shopping',
};

export const CATEGORY_DOT_CLASS: Readonly<Record<CategoryHue, string>> = {
  safety: 'bg-category-safety',
  city: 'bg-category-city',
  transport: 'bg-category-transport',
  green: 'bg-category-green',
  education: 'bg-category-education',
  health: 'bg-category-health',
  shopping: 'bg-category-shopping',
};

export type ZoneScoreKey =
  'safety' | 'city' | 'transport' | 'green' | 'education' | 'health' | 'shopping';

export const ZONE_SCORES: readonly { key: ZoneScoreKey; score: number; icon: LucideIcon }[] = [
  { key: 'safety', score: 78, icon: ShieldCheckIcon },
  { key: 'city', score: 86, icon: FootprintsIcon },
  { key: 'transport', score: 92, icon: BusIcon },
  { key: 'green', score: 71, icon: TreesIcon },
  { key: 'education', score: 84, icon: GraduationCapIcon },
  { key: 'health', score: 68, icon: StethoscopeIcon },
  { key: 'shopping', score: 90, icon: ShoppingBagIcon },
];

export const ZONE_OVERALL_SCORE = 82;
export const ZONE_PRICE_PER_M2 = 2000;
export const PRICES_ICON = EuroIcon;
