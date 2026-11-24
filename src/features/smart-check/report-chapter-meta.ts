import {
  ActivityIcon,
  BusIcon,
  FactoryIcon,
  GraduationCapIcon,
  HeartPulseIcon,
  LayoutGridIcon,
  LeafIcon,
  MapIcon,
  ShieldIcon,
  TrendingUpIcon,
  Volume2Icon,
  WindIcon,
  type LucideIcon,
} from 'lucide-react';
import type { ReportHue } from '@/components/report/report-hues';
import type { ReportChapter } from './report-chapters';
import type { ReportCategoryKey } from './report.types';

export const REPORT_TABS = [
  'summary',
  'safety',
  'accessibility',
  'fifteenMinute',
  'green',
  'noise',
  'airIndustry',
  'seismic',
  'investment',
] as const satisfies readonly ReportChapter[];

export type ReportTab = (typeof REPORT_TABS)[number];

export const REPORT_TAB_META: Readonly<
  Record<ReportTab, { icon: LucideIcon; hue: ReportHue; category: ReportCategoryKey | null }>
> = {
  summary: { icon: LayoutGridIcon, hue: 'summary', category: null },
  safety: { icon: ShieldIcon, hue: 'safety', category: 'safety' },
  accessibility: { icon: BusIcon, hue: 'accessibility', category: 'accessibility' },
  fifteenMinute: { icon: MapIcon, hue: 'fifteenMinute', category: 'fifteen_minute' },
  green: { icon: LeafIcon, hue: 'green', category: 'green' },
  noise: { icon: Volume2Icon, hue: 'noise', category: 'noise' },
  airIndustry: { icon: WindIcon, hue: 'air', category: 'air' },
  seismic: { icon: ActivityIcon, hue: 'context', category: null },
  investment: { icon: TrendingUpIcon, hue: 'context', category: null },
};

export const CATEGORY_META: Readonly<
  Record<ReportCategoryKey, { icon: LucideIcon; hue: ReportHue; chapter: ReportTab }>
> = {
  safety: { icon: ShieldIcon, hue: 'safety', chapter: 'safety' },
  accessibility: { icon: BusIcon, hue: 'accessibility', chapter: 'accessibility' },
  fifteen_minute: { icon: MapIcon, hue: 'fifteenMinute', chapter: 'fifteenMinute' },
  green: { icon: LeafIcon, hue: 'green', chapter: 'green' },
  noise: { icon: Volume2Icon, hue: 'noise', chapter: 'noise' },
  air: { icon: WindIcon, hue: 'air', chapter: 'airIndustry' },
  industry: { icon: FactoryIcon, hue: 'industry', chapter: 'airIndustry' },
  education: { icon: GraduationCapIcon, hue: 'education', chapter: 'fifteenMinute' },
  health: { icon: HeartPulseIcon, hue: 'health', chapter: 'fifteenMinute' },
};

export function nextTab(tab: ReportTab): ReportTab | undefined {
  return REPORT_TABS[REPORT_TABS.indexOf(tab) + 1];
}
