import type { Sql } from '../db/sql.ts';

export async function limitCoveredCities(sql: Sql, slug: string): Promise<() => Promise<void>> {
  const excluded = await sql<{ id: string }[]>`
    update public.cities
    set has_online_coverage = false
    where has_online_coverage and slug <> ${slug}
    returning id
  `;
  return async () => {
    if (excluded.length === 0) return;
    await sql`
      update public.cities
      set has_online_coverage = true
      where id in ${sql(excluded.map((city) => city.id))}
    `;
  };
}
