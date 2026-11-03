import type { LngLat } from '@/components/map/map.config';

export const CATEGORY_KEYS = [
  'safety',
  'accessibility',
  'fifteen_minute',
  'green',
  'noise',
  'air',
  'industry',
  'education',
  'health',
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CHAPTER_IDS = [
  'summary',
  'safety',
  'accessibility',
  'fifteen_minute',
  'green',
  'noise',
  'air',
  'industry',
] as const;

export type ChapterId = (typeof CHAPTER_IDS)[number];

export type ScoreChapterId = Exclude<ChapterId, 'summary'>;

export const CHAPTER_CATEGORIES: Readonly<Record<ScoreChapterId, readonly CategoryKey[]>> = {
  safety: ['safety'],
  accessibility: ['accessibility'],
  fifteen_minute: ['fifteen_minute', 'education', 'health'],
  green: ['green'],
  noise: ['noise'],
  air: ['air'],
  industry: ['industry'],
};

export const DAY_MOMENTS = ['day', 'night'] as const;

export type DayMoment = (typeof DAY_MOMENTS)[number];

export type CategoryGroupId = 'mostImportant' | 'environment' | 'services';

export const CATEGORY_GROUPS: readonly {
  id: CategoryGroupId;
  chapter: ScoreChapterId;
  keys: readonly CategoryKey[];
}[] = [
  {
    id: 'mostImportant',
    chapter: 'accessibility',
    keys: ['accessibility', 'fifteen_minute', 'safety'],
  },
  { id: 'environment', chapter: 'noise', keys: ['noise', 'green', 'air', 'industry'] },
  { id: 'services', chapter: 'fifteen_minute', keys: ['education', 'health'] },
];

export type CategorySummary = {
  score: number | null;
  percentile: number | null;
  city_avg: number | null;
  histogram: number[];
  weight: number;
};

export type ScoreBand = 'excellent' | 'veryGood' | 'good' | 'average' | 'belowAverage';

export function scoreBand(score: number): ScoreBand {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'veryGood';
  if (score >= 55) return 'good';
  if (score >= 40) return 'average';
  return 'belowAverage';
}

export function isScoreChapter(id: ChapterId): id is ScoreChapterId {
  return id !== 'summary';
}

export function nextChapter(id: ChapterId): ChapterId | undefined {
  return CHAPTER_IDS[CHAPTER_IDS.indexOf(id) + 1];
}

export function chapterScore(
  id: ChapterId,
  zoneScore: number | null,
  categories: Readonly<Record<CategoryKey, CategorySummary>>,
): number | null {
  return isScoreChapter(id) ? categories[id].score : zoneScore;
}

export function chapterOfCategory(key: CategoryKey): ScoreChapterId {
  return key === 'education' || key === 'health' ? 'fifteen_minute' : key;
}

export type Highlight = {
  key: CategoryKey;
  score: number;
  cityAverage: number;
  percentile: number;
};

const HIGHLIGHT_MARGIN = 5;
const HIGHLIGHT_LIMIT = 3;

function comparable(
  categories: Readonly<Record<CategoryKey, CategorySummary>>,
): (Highlight & { gap: number })[] {
  return CATEGORY_KEYS.flatMap((key) => {
    const { score, city_avg: cityAverage, percentile } = categories[key];
    if (score === null || cityAverage === null || percentile === null) return [];
    return [{ key, score, cityAverage, percentile, gap: score - cityAverage }];
  });
}

function toHighlight({ key, score, cityAverage, percentile }: Highlight): Highlight {
  return { key, score, cityAverage, percentile };
}

export function reportHighlights(categories: Readonly<Record<CategoryKey, CategorySummary>>): {
  strengths: Highlight[];
  concerns: Highlight[];
} {
  const scored = comparable(categories);
  return {
    strengths: scored
      .filter((item) => item.gap >= HIGHLIGHT_MARGIN)
      .sort((left, right) => right.gap - left.gap)
      .slice(0, HIGHLIGHT_LIMIT)
      .map(toHighlight),
    concerns: scored
      .filter((item) => item.gap <= -HIGHLIGHT_MARGIN)
      .sort((left, right) => left.gap - right.gap)
      .slice(0, HIGHLIGHT_LIMIT)
      .map(toHighlight),
  };
}

export function scoredCategories(
  categories: Readonly<Record<CategoryKey, CategorySummary>>,
): { key: CategoryKey; score: number }[] {
  return CATEGORY_KEYS.flatMap((key) => {
    const { score } = categories[key];
    return score === null ? [] : [{ key, score }];
  });
}

export function bestAndWorst(categories: Readonly<Record<CategoryKey, CategorySummary>>): {
  best: CategoryKey | undefined;
  worst: CategoryKey | undefined;
} {
  const ordered = scoredCategories(categories).sort((left, right) => right.score - left.score);
  const best = ordered[0];
  const worst = ordered.length > 1 ? ordered[ordered.length - 1] : undefined;
  return { best: best?.key, worst: worst?.key };
}

export function reportCode(number: number, createdAt: string): string {
  return `SC-${String(new Date(createdAt).getUTCFullYear())}-${String(number).padStart(5, '0')}`;
}

const HISTOGRAM_BIN_SIZE = 5;

export function histogramBin(score: number, binCount: number): number {
  return Math.min(Math.floor(score / HISTOGRAM_BIN_SIZE), binCount - 1);
}

export function binRange(bin: number): { from: number; to: number } {
  const from = bin * HISTOGRAM_BIN_SIZE;
  return { from, to: Math.min(from + HISTOGRAM_BIN_SIZE - 1, 100) };
}

const EARTH_RADIUS_M = 6_371_008.8;

export function circleRing(center: LngLat, radiusM: number, steps = 72): LngLat[] {
  const [longitude, latitude] = center;
  const latitudeRad = (latitude * Math.PI) / 180;
  const angularDistance = radiusM / EARTH_RADIUS_M;
  const points: LngLat[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const bearing = (2 * Math.PI * step) / steps;
    const pointLatitude = Math.asin(
      Math.sin(latitudeRad) * Math.cos(angularDistance) +
        Math.cos(latitudeRad) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const pointLongitude =
      (longitude * Math.PI) / 180 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitudeRad),
        Math.cos(angularDistance) - Math.sin(latitudeRad) * Math.sin(pointLatitude),
      );
    points.push([(pointLongitude * 180) / Math.PI, (pointLatitude * 180) / Math.PI]);
  }
  return points;
}

export const SHARE_EXPIRIES = ['never', 'month', 'week'] as const;

export type ShareExpiry = (typeof SHARE_EXPIRIES)[number];

const SHARE_EXPIRY_DAYS: Readonly<Record<ShareExpiry, number | null>> = {
  never: null,
  month: 30,
  week: 7,
};

export function shareExpiryDays(expiry: ShareExpiry): number | null {
  return SHARE_EXPIRY_DAYS[expiry];
}

export function reportShareUrl(siteUrl: string, reportId: string, token: string): string {
  const url = new URL(`/check/result/${reportId}`, siteUrl);
  url.searchParams.set('share', token);
  return url.toString();
}

export function isDarkColour(hex: string): boolean {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return false;
  const [red, green, blue] = match.slice(1).map((part) => {
    const channel = Number.parseInt(part, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
  return luminance < 0.179;
}
