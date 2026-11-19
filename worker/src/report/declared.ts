import type { Sql } from '../db/sql.ts';

export type DeclaredDetails = {
  areaM2: number | null;
  rooms: number | null;
  floor: number | null;
  buildingFloors: number | null;
  hasElevator: boolean | null;
  constructionYear: number | null;
};

const NO_DECLARED_DETAILS: DeclaredDetails = {
  areaM2: null,
  rooms: null,
  floor: null,
  buildingFloors: null,
  hasElevator: null,
  constructionYear: null,
};

export async function readDeclaredDetails(
  sql: Sql,
  reportId: string | undefined,
): Promise<DeclaredDetails> {
  if (reportId === undefined) return NO_DECLARED_DETAILS;
  const [row] = await sql<
    {
      area_m2: string | null;
      rooms: number | null;
      floor: number | null;
      building_floors: number | null;
      has_elevator: boolean | null;
      construction_year: number | null;
    }[]
  >`
    select
      declared_area_m2 as area_m2,
      declared_rooms as rooms,
      declared_floor as floor,
      declared_building_floors as building_floors,
      declared_has_elevator as has_elevator,
      declared_construction_year as construction_year
    from public.online_reports
    where id = ${reportId}
  `;
  if (!row) return NO_DECLARED_DETAILS;
  return {
    areaM2: row.area_m2 === null ? null : Number(row.area_m2),
    rooms: row.rooms,
    floor: row.floor,
    buildingFloors: row.building_floors,
    hasElevator: row.has_elevator,
    constructionYear: row.construction_year,
  };
}
