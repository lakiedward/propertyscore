import {
  BusIcon,
  ClockIcon,
  FlagIcon,
  FlameIcon,
  HouseIcon,
  LeafIcon,
  LightbulbIcon,
  MapPinIcon,
  PillIcon,
  HeartPulseIcon,
  RouteIcon,
  ShieldIcon,
  ShoppingBagIcon,
  TrainFrontIcon,
  WineIcon,
  type LucideIcon,
} from 'lucide-react';
import { formatNumber } from '@/i18n/format';
import type { ReportResult } from './report.types';

type Safety = NonNullable<ReportResult['sections']['safety']>;
export type SafetyLandmark = Safety['landmarks'][number];
export type SafetyWhen = 'day' | 'night';

type SafetyTypeMeta = { icon: LucideIcon; colorVar: string };

const FALLBACK_TYPE: SafetyTypeMeta = { icon: MapPinIcon, colorVar: '--ps-green-500' };

const SAFETY_TYPES: Readonly<Record<string, SafetyTypeMeta>> = {
  lighting: { icon: LightbulbIcon, colorVar: '--ps-amber-400' },
  shop: { icon: ShoppingBagIcon, colorVar: '--ps-slate-700' },
  nonstop: { icon: ClockIcon, colorVar: '--ps-violet-600' },
  mixed_use: { icon: HouseIcon, colorVar: '--ps-slate-700' },
  police: { icon: ShieldIcon, colorVar: '--ps-sky-600' },
  fire_station: { icon: FlameIcon, colorVar: '--ps-coral-600' },
  diplomatic: { icon: FlagIcon, colorVar: '--ps-aqua-600' },
  bar: { icon: WineIcon, colorVar: '--ps-berry-600' },
  park: { icon: LeafIcon, colorVar: '--ps-leaf-600' },
  park_lit: { icon: LeafIcon, colorVar: '--ps-leaf-600' },
  isolated_passage: { icon: RouteIcon, colorVar: '--ps-ochre-600' },
  train_station: { icon: TrainFrontIcon, colorVar: '--ps-steel-600' },
  train_halt: { icon: TrainFrontIcon, colorVar: '--ps-steel-600' },
  transit_stop: { icon: BusIcon, colorVar: '--ps-steel-600' },
};

export function safetyTypeMeta(type: string): SafetyTypeMeta {
  return SAFETY_TYPES[type] ?? FALLBACK_TYPE;
}

export type SafetyRow = {
  type: string;
  points: number;
  count: number;
  nearestM: number | null;
};

export type SafetyBreakdown = {
  start: number;
  score: number;
  raises: SafetyRow[];
  lowers: SafetyRow[];
  up: number;
  down: number;
  kept: number;
  farTypes: { type: string; distanceM: number | null }[];
};

export function safetyBreakdown(safety: Safety, when: SafetyWhen): SafetyBreakdown {
  const moment = safety.address[when];
  const start = Math.round(safety.address.start);
  const score = Math.round(moment.score);
  const rows = moment.contributions
    .map((item) => ({
      type: item.type,
      points: Math.round(item.points),
      count: item.count,
      nearestM: item.nearest_m,
    }))
    .filter((row) => row.points !== 0);
  const raises = rows.filter((row) => row.points > 0).sort((a, b) => b.points - a.points);
  const lowers = rows.filter((row) => row.points < 0).sort((a, b) => a.points - b.points);
  const down = lowers.reduce((sum, row) => sum - row.points, 0);
  const up = Math.max(0, score - start + down);
  const farTypes = moment.far_types.map((type) => ({
    type,
    distanceM: nearestLandmark(safety.landmarks, type)?.distance_m ?? null,
  }));
  return { start, score, raises, lowers, up, down, kept: Math.max(0, score - start), farTypes };
}

function nearestLandmark(
  landmarks: readonly SafetyLandmark[],
  type: string,
): SafetyLandmark | undefined {
  return landmarks
    .filter((landmark) => landmark.type === type)
    .sort((left, right) => left.distance_m - right.distance_m)[0];
}

const CHIP_TYPES = [
  'lighting',
  'shop',
  'nonstop',
  'diplomatic',
  'transit_stop',
  'bar',
  'park',
  'isolated_passage',
  'police',
  'fire_station',
  'train_station',
] as const;

export function landmarkTypes(landmarks: readonly SafetyLandmark[]): string[] {
  const present = new Set(landmarks.map((landmark) => landmark.type));
  const extra = [...present].filter((type) => !(CHIP_TYPES as readonly string[]).includes(type));
  return [...CHIP_TYPES, ...extra];
}

const HELP_LANDMARKS = ['nonstop', 'police', 'fire_station'] as const;
const HELP_LAYERS: Readonly<Record<string, { icon: LucideIcon; colorVar: string }>> = {
  h5: { icon: PillIcon, colorVar: '--ps-aqua-600' },
  h4: { icon: HeartPulseIcon, colorVar: '--ps-berry-600' },
};
const WALK_METRES_PER_MINUTE = 80;
const WALKABLE_M = 1500;
const CAR_METRES_PER_MINUTE = 500;

export type HelpRow = {
  key: string;
  icon: LucideIcon;
  colorVar: string;
  titleKey: string;
  name: string | null;
  metres: number | null;
  minutes: number | null;
  mode: 'walk' | 'car';
  barValue: number;
};

export function helpRows(result: ReportResult): HelpRow[] {
  const { safety, health } = result.sections;
  if (!safety) return [];
  const landmarks = HELP_LANDMARKS.flatMap((type): HelpRow[] => {
    const nearest = nearestLandmark(safety.landmarks, type);
    if (!nearest) return [];
    const meta = safetyTypeMeta(type);
    return [
      {
        key: type,
        icon: meta.icon,
        colorVar: meta.colorVar,
        titleKey: type,
        name: nearest.name,
        metres: nearest.distance_m,
        minutes: null,
        mode: nearest.distance_m <= WALKABLE_M ? 'walk' : 'car',
        barValue: nearest.distance_m,
      },
    ];
  });
  const medical = (health?.layers ?? []).flatMap((layer): HelpRow[] => {
    const meta = HELP_LAYERS[layer.key];
    if (!meta || layer.minutes === null) return [];
    return [
      {
        key: layer.key,
        icon: meta.icon,
        colorVar: meta.colorVar,
        titleKey: layer.key,
        name: layer.place?.name ?? null,
        metres: null,
        minutes: layer.minutes,
        mode: layer.mode === 'car' ? 'car' : 'walk',
        barValue:
          layer.minutes * (layer.mode === 'car' ? CAR_METRES_PER_MINUTE : WALK_METRES_PER_MINUTE),
      },
    ];
  });
  return [...landmarks, ...medical].sort((a, b) => a.barValue - b.barValue);
}

export function mapRadiusM(landmarks: readonly SafetyLandmark[]): number {
  const MIN_M = 1100;
  const MAX_M = 1400;
  const PADDING_M = 120;
  const reach = Math.max(
    MIN_M,
    ...landmarks
      .filter((l) => l.distance_m + PADDING_M <= MAX_M)
      .map((l) => l.distance_m + PADDING_M),
  );
  return Math.min(reach, MAX_M);
}

export function formatDistanceM(metres: number): string {
  if (metres < 1000) {
    return formatNumber(Math.round(metres / 10) * 10 || Math.round(metres), {
      style: 'unit',
      unit: 'meter',
    });
  }
  return formatNumber(metres / 1000, {
    style: 'unit',
    unit: 'kilometer',
    maximumFractionDigits: 1,
  });
}

const WALK_DETOUR = 1.3;

export function walkMinutes(metres: number): number {
  return Math.max(1, Math.round((metres * WALK_DETOUR) / WALK_METRES_PER_MINUTE));
}
