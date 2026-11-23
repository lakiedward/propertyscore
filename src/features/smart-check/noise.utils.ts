import type { TFunction } from 'i18next';
import { z } from 'zod';
import type { LngLat } from '@/components/map/map.config';
import { lineCollection } from '@/components/report/report-map.utils';
import { formatNumber } from '@/i18n/format';
import { positionSchema } from './sections/shared.schemas';
import type { ReportResult } from './report.types';

type Noise = NonNullable<ReportResult['sections']['noise']>;
export type NoiseSource = Noise['sources'][number];

const BAND_DB = 5;
const LISTED_SOURCES = 4;
const LOUD_ROADS = ['motorway', 'trunk', 'primary'];
const BUSY_ROADS = ['secondary'];

export const NOISE_REFERENCES = [40, 50, 60, 70] as const;

export const NOISE_SOURCE_COLORS = {
  loud: '--ps-coral-600',
  busy: '--ps-ochre-600',
  moderate: '--ps-amber-400',
  rail: '--ps-steel-600',
} as const;

export function decibelBand(value: number): string {
  const low = Math.floor(value / BAND_DB) * BAND_DB;
  return `${formatNumber(low)}–${formatNumber(low + BAND_DB)} dB`;
}

export function closestReference(value: number): (typeof NOISE_REFERENCES)[number] {
  return NOISE_REFERENCES.reduce((closest, db) =>
    Math.abs(db - value) < Math.abs(closest - value) ? db : closest,
  );
}

export function sourceColorVar(kind: string, sourceClass: string): string {
  if (kind === 'rail') return NOISE_SOURCE_COLORS.rail;
  if (kind === 'tram') return NOISE_SOURCE_COLORS.busy;
  if (LOUD_ROADS.includes(sourceClass)) return NOISE_SOURCE_COLORS.loud;
  return BUSY_ROADS.includes(sourceClass) ? NOISE_SOURCE_COLORS.busy : NOISE_SOURCE_COLORS.moderate;
}

export function listedSources(sources: readonly NoiseSource[]): NoiseSource[] {
  const byDistance = [...sources].sort((left, right) => left.distance_m - right.distance_m);
  const seen = new Set<string>();
  const distinct = byDistance.filter((source) => {
    const key = source.name ?? source.source_class;
    if (seen.has(key) || source.source_class === 'residential') return false;
    seen.add(key);
    return true;
  });
  return (distinct.length > 0 ? distinct : byDistance).slice(0, LISTED_SOURCES);
}

const lineGeometrySchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(positionSchema),
});

export function sourceLinesByColor(lines: NonNullable<Noise['map']['lines']>) {
  const groups = new Map<string, LngLat[][]>();
  for (const feature of lines.features) {
    const geometry = lineGeometrySchema.safeParse(feature.geometry);
    if (!geometry.success) continue;
    const kind = feature.properties?.kind;
    const sourceClass = feature.properties?.source_class;
    if (typeof kind !== 'string' || typeof sourceClass !== 'string') continue;
    const color = sourceColorVar(kind, sourceClass);
    groups.set(color, [...(groups.get(color) ?? []), geometry.data.coordinates]);
  }
  return [...groups].map(([color, coordinates]) => ({
    color,
    data: lineCollection(coordinates),
  }));
}

export function noiseReferenceLabel(
  t: TFunction<'smartCheck'>,
  db: (typeof NOISE_REFERENCES)[number],
): string {
  switch (db) {
    case 40:
      return t('report.chapters.noise.references.40');
    case 50:
      return t('report.chapters.noise.references.50');
    case 60:
      return t('report.chapters.noise.references.60');
    case 70:
      return t('report.chapters.noise.references.70');
  }
}
