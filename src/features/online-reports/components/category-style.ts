import {
  BusIcon,
  FactoryIcon,
  FootprintsIcon,
  GraduationCapIcon,
  HeartPulseIcon,
  LayoutDashboardIcon,
  ShieldIcon,
  TreesIcon,
  Volume2Icon,
  WindIcon,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryKey, ChapterId } from '../online-report.utils';

type CategoryHue = 'transport' | 'shopping' | 'safety' | 'green' | 'education' | 'health';

type HueClasses = {
  tile: string;
  fill: string;
  track: string;
  ink: string;
  underline: string;
  border: string;
};

const HUE_CLASSES: Readonly<Record<CategoryHue, HueClasses>> = {
  transport: {
    tile: 'bg-category-transport-surface text-category-transport-strong',
    fill: 'bg-category-transport',
    track: 'bg-category-transport-surface',
    ink: 'text-category-transport-strong',
    underline: 'data-active:border-category-transport',
    border: 'border-category-transport',
  },
  shopping: {
    tile: 'bg-category-shopping-surface text-category-shopping',
    fill: 'bg-category-shopping',
    track: 'bg-category-shopping-surface',
    ink: 'text-category-shopping',
    underline: 'data-active:border-category-shopping',
    border: 'border-category-shopping',
  },
  safety: {
    tile: 'bg-category-safety-surface text-category-safety',
    fill: 'bg-category-safety',
    track: 'bg-category-safety-surface',
    ink: 'text-category-safety',
    underline: 'data-active:border-category-safety',
    border: 'border-category-safety',
  },
  green: {
    tile: 'bg-category-green-surface text-category-green',
    fill: 'bg-category-green',
    track: 'bg-category-green-surface',
    ink: 'text-category-green',
    underline: 'data-active:border-category-green',
    border: 'border-category-green',
  },
  education: {
    tile: 'bg-category-education-surface text-category-education',
    fill: 'bg-category-education',
    track: 'bg-category-education-surface',
    ink: 'text-category-education',
    underline: 'data-active:border-category-education',
    border: 'border-category-education',
  },
  health: {
    tile: 'bg-category-health-surface text-category-health-strong',
    fill: 'bg-category-health',
    track: 'bg-category-health-surface',
    ink: 'text-category-health-strong',
    underline: 'data-active:border-category-health',
    border: 'border-category-health',
  },
};

const CATEGORY_HUE: Readonly<Record<CategoryKey, CategoryHue>> = {
  safety: 'safety',
  accessibility: 'transport',
  fifteen_minute: 'shopping',
  green: 'green',
  noise: 'safety',
  air: 'green',
  industry: 'safety',
  education: 'education',
  health: 'health',
};

export const CATEGORY_ICON: Readonly<Record<CategoryKey, LucideIcon>> = {
  safety: ShieldIcon,
  accessibility: BusIcon,
  fifteen_minute: FootprintsIcon,
  green: TreesIcon,
  noise: Volume2Icon,
  air: WindIcon,
  industry: FactoryIcon,
  education: GraduationCapIcon,
  health: HeartPulseIcon,
};

export const CHAPTER_ICON: Readonly<Record<ChapterId, LucideIcon>> = {
  summary: LayoutDashboardIcon,
  safety: ShieldIcon,
  accessibility: BusIcon,
  fifteen_minute: FootprintsIcon,
  green: TreesIcon,
  noise: Volume2Icon,
  air: WindIcon,
  industry: FactoryIcon,
};

export function categoryClasses(key: CategoryKey): HueClasses {
  return HUE_CLASSES[CATEGORY_HUE[key]];
}
