import type { BuildingPeriod, HazardLevel, SeismicParams } from './seismic.params.ts';

export function hazardLevel(
  agG: number,
  params: Pick<SeismicParams, 'levels' | 'top_level'>,
): HazardLevel {
  const match = params.levels.find(([maxAgG]) => agG <= maxAgG);
  return match ? match[1] : params.top_level;
}

export function roundAcceleration(agG: number): number {
  return Math.round(agG * 100) / 100;
}

export function buildingPeriod(
  constructionYear: number,
  periods: readonly BuildingPeriod[],
): BuildingPeriod | undefined {
  return periods.find(
    (period) => period.until_year === null || constructionYear <= period.until_year,
  );
}
