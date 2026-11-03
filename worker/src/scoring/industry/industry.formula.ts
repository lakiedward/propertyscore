import { z } from 'zod';

const SECTOR_CODES = [
  'energy',
  'metals',
  'minerals',
  'chemicals',
  'waste_water',
  'paper_wood',
  'livestock',
  'food',
  'other',
] as const;

export type SectorCode = (typeof SECTOR_CODES)[number];

export type EmissionClass = 'none' | 'reported' | 'top';

const sectorWeightsSchema = z.object(
  Object.fromEntries(SECTOR_CODES.map((code) => [code, z.number().min(0).max(10)])) as Record<
    SectorCode,
    z.ZodNumber
  >,
);

export const industryParamsSchema = z.object({
  dataset: z.object({
    url: z.url({ protocol: /^https$/ }),
    version: z.string().regex(/^[a-z0-9_.-]{1,40}$/),
    country: z.string().min(2).max(60),
  }),
  radius_m: z.number().int().min(500).max(20000),
  decay: z
    .array(z.tuple([z.number().min(0), z.number().min(0)]))
    .min(2)
    .refine(
      (points) =>
        points.every((point, index) => index === 0 || point[0] > (points[index - 1]?.[0] ?? 0)),
      'decay distances must increase',
    ),
  k: z.number().positive().max(5),
  sector_weights: sectorWeightsSchema,
  emission_multipliers: z.object({
    none: z.number().min(0).max(10),
    reported: z.number().min(0).max(10),
    top: z.number().min(0).max(10),
  }),
  air_pollutants: z.array(z.string().regex(/^[a-z0-9_]+$/)).min(1),
  top_emitter_pollutants: z.array(z.string().regex(/^[a-z0-9_]+$/)).min(1),
  top_emitter_share: z.number().gt(0).max(1),
  odour_sectors: z.array(z.enum(SECTOR_CODES)),
  winter_activities: z.array(z.string().min(1)),
  suspect_center_m: z.number().int().min(0).max(5000),
  near_m: z.number().int().min(100).max(5000),
});

export type IndustryParams = z.infer<typeof industryParamsSchema>;

export type SiteContribution = {
  siteId: string;
  distanceM: number;
  weight: number;
  factor: number;
};

export function distanceFactor(distanceM: number, decay: IndustryParams['decay']): number {
  const first = decay[0];
  const last = decay[decay.length - 1];
  if (!first || !last) return 0;
  if (distanceM <= first[0]) return first[1];
  if (distanceM >= last[0]) return last[1];
  for (let index = 1; index < decay.length; index += 1) {
    const end = decay[index];
    const start = decay[index - 1];
    if (!start || !end || distanceM > end[0]) continue;
    const ratio = (distanceM - start[0]) / (end[0] - start[0]);
    return start[1] + ratio * (end[1] - start[1]);
  }
  return 0;
}

export function emissionClass(hasAirReleases: boolean, isTopEmitter: boolean): EmissionClass {
  if (isTopEmitter) return 'top';
  return hasAirReleases ? 'reported' : 'none';
}

export function siteWeight(
  sector: SectorCode,
  emission: EmissionClass,
  params: Pick<IndustryParams, 'sector_weights' | 'emission_multipliers'>,
): number {
  return params.sector_weights[sector] * params.emission_multipliers[emission];
}

export function industryPressure(contributions: readonly SiteContribution[]): number {
  return contributions.reduce((sum, site) => sum + site.weight * site.factor, 0);
}

export function industryScore(pressure: number, k: number): number {
  return Math.round(100 * Math.exp(-k * pressure));
}

export function pointsLostPerSite(
  contributions: readonly SiteContribution[],
  score: number,
): Map<string, number> {
  const total = 100 - score;
  const pressure = industryPressure(contributions);
  const lost = new Map<string, number>();
  if (pressure <= 0 || total <= 0) {
    for (const site of contributions) lost.set(site.siteId, 0);
    return lost;
  }
  const shares = contributions.map((site) => {
    const exact = (total * site.weight * site.factor) / pressure;
    return { siteId: site.siteId, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let left = total - shares.reduce((sum, share) => sum + share.floor, 0);
  const byRemainder = [...shares].sort(
    (a, b) => b.remainder - a.remainder || a.siteId.localeCompare(b.siteId),
  );
  for (const share of byRemainder) {
    lost.set(share.siteId, share.floor + (left > 0 ? 1 : 0));
    left -= 1;
  }
  return lost;
}

export function topEmitterThresholds(
  releases: ReadonlyMap<string, Readonly<Record<string, number>>>,
  pollutants: readonly string[],
  share: number,
): Map<string, number> {
  const thresholds = new Map<string, number>();
  for (const pollutant of pollutants) {
    const values = [...releases.values()]
      .map((facility) => facility[pollutant])
      .filter((value): value is number => value !== undefined && value > 0)
      .sort((a, b) => b - a);
    if (values.length === 0) continue;
    const count = Math.max(1, Math.ceil(values.length * share));
    const threshold = values[count - 1];
    if (threshold !== undefined) thresholds.set(pollutant, threshold);
  }
  return thresholds;
}

export function isTopEmitter(
  facilityReleases: Readonly<Record<string, number>>,
  thresholds: ReadonlyMap<string, number>,
): boolean {
  for (const [pollutant, threshold] of thresholds) {
    const value = facilityReleases[pollutant];
    if (value !== undefined && value >= threshold) return true;
  }
  return false;
}
