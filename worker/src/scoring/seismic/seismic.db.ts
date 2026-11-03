import type { Sql } from '../../db/sql.ts';

export type AddressHazard = {
  ag_g: number;
  distance_m: number;
};

export type CityHazard = {
  slug: string;
  ag_g: number;
  zone_count: number;
};

export async function hazardAt(
  sql: Sql,
  options: { longitude: number; latitude: number; code: string; snapM: number },
): Promise<AddressHazard | null> {
  const [row] = await sql<AddressHazard[]>`
    select ag_g::double precision as ag_g, distance_m
    from private.seismic_hazard_at(
      extensions.st_point(${options.longitude}, ${options.latitude}, 4326)::extensions.geography,
      ${options.code},
      ${options.snapM}
    )
  `;
  return row ?? null;
}

export async function cityHazards(sql: Sql, code: string): Promise<CityHazard[]> {
  const rows = await sql<CityHazard[]>`
    select slug, ag_g::double precision as ag_g, zone_count
    from private.seismic_city_hazards(${code})
  `;
  return [...rows];
}
