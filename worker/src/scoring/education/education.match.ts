import { nameSimilarity, placeWords } from './education.names.ts';
import type { EducationLevel, OsmEducationUnit, Point } from './education.osm.ts';
import type { EducationParams } from './education.params.ts';
import type { RegisterRow } from './education.siiir.ts';

type MatchStatus = 'matched' | 'siiir_only' | 'osm_only' | 'excluded';

export type InstitutionRow = {
  siiir_code: string | null;
  parent_siiir_code: string | null;
  osm_ref: string | null;
  name: string | null;
  levels: EducationLevel[];
  ownership: 'public' | 'private' | 'unknown';
  teaching_languages: string[] | null;
  address_text: string | null;
  lng: number | null;
  lat: number | null;
  location_precision: 'osm' | 'geocoded' | null;
  match_status: MatchStatus;
  source_date: string | null;
};

type LevelGroup = 'early' | 'school' | 'high_school' | 'university';

const LEVEL_GROUP: Record<EducationLevel, LevelGroup> = {
  nursery: 'early',
  kindergarten: 'early',
  primary: 'school',
  lower_secondary: 'school',
  upper_secondary: 'high_school',
  university: 'university',
};

const EARTH_RADIUS_M = 6_371_008.8;

export function haversineMeters(a: Point, b: Point): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function sharesLevelGroup(a: readonly EducationLevel[], b: readonly EducationLevel[]): boolean {
  const groups = new Set(a.map((level) => LEVEL_GROUP[level]));
  return b.some((level) => groups.has(LEVEL_GROUP[level]));
}

function registerLocation(row: RegisterRow): Point | null {
  return row.lng === null || row.lat === null ? null : { lng: row.lng, lat: row.lat };
}

function registerStatus(row: RegisterRow, isMatched: boolean): MatchStatus {
  if (row.is_excluded) return 'excluded';
  return isMatched ? 'matched' : 'siiir_only';
}

type Pairing = { registerIndex: number; osmIndex: number; similarity: number };

function proposePairings(
  register: readonly RegisterRow[],
  osm: readonly OsmEducationUnit[],
  params: EducationParams['match'],
): Pairing[] {
  const proposals: Pairing[] = [];
  const nameOnly: Pairing[] = [];
  register.forEach((row, registerIndex) => {
    const location = registerLocation(row);
    const ignoredWords = placeWords(row.city_slug);
    const scored = osm
      .map((unit, osmIndex) => ({
        osmIndex,
        unit,
        similarity: unit.name ? nameSimilarity(row.name, unit.name, ignoredWords) : 0,
      }))
      .filter(({ unit }) => row.is_excluded || sharesLevelGroup(row.levels, unit.levels));

    if (location) {
      const near = scored.filter(
        ({ unit, similarity }) =>
          similarity >= params.min_similarity &&
          haversineMeters(location, unit.location) <= params.radius_m,
      );
      for (const { osmIndex, similarity } of near) {
        proposals.push({ registerIndex, osmIndex, similarity });
      }
      return;
    }

    const confident = scored.filter(({ similarity }) => similarity >= params.name_only_similarity);
    const best = confident.reduce((max, { similarity }) => Math.max(max, similarity), 0);
    const top = confident.filter(({ similarity }) => similarity === best);
    const first = top[0];
    const isOnePlace =
      first !== undefined &&
      top.every(
        ({ unit }) => haversineMeters(first.unit.location, unit.location) <= params.radius_m,
      );
    if (first && isOnePlace) {
      nameOnly.push({ registerIndex, osmIndex: first.osmIndex, similarity: first.similarity });
    }
  });

  const claims = new Map<number, number>();
  for (const pairing of nameOnly) {
    claims.set(pairing.osmIndex, (claims.get(pairing.osmIndex) ?? 0) + 1);
  }
  proposals.push(...nameOnly.filter((pairing) => claims.get(pairing.osmIndex) === 1));

  return proposals.sort(
    (a, b) =>
      b.similarity - a.similarity || a.registerIndex - b.registerIndex || a.osmIndex - b.osmIndex,
  );
}

export function matchInstitutions(
  register: readonly RegisterRow[],
  osm: readonly OsmEducationUnit[],
  params: EducationParams['match'],
): InstitutionRow[] {
  const registerMatch = new Map<number, number>();
  const usedOsm = new Set<number>();
  for (const pairing of proposePairings(register, osm, params)) {
    if (registerMatch.has(pairing.registerIndex) || usedOsm.has(pairing.osmIndex)) continue;
    registerMatch.set(pairing.registerIndex, pairing.osmIndex);
    usedOsm.add(pairing.osmIndex);
  }

  const rows: InstitutionRow[] = register.map((row, index) => {
    const osmIndex = registerMatch.get(index);
    const unit = osmIndex === undefined ? undefined : osm[osmIndex];
    const location = unit?.location ?? registerLocation(row);
    return {
      siiir_code: row.siiir_code,
      parent_siiir_code: row.parent_siiir_code,
      osm_ref: unit?.osmRef ?? null,
      name: row.name,
      levels: row.levels,
      ownership: row.ownership,
      teaching_languages: row.teaching_languages,
      address_text: row.address,
      lng: location?.lng ?? null,
      lat: location?.lat ?? null,
      location_precision: unit ? 'osm' : location ? 'geocoded' : null,
      match_status: registerStatus(row, unit !== undefined),
      source_date: row.source_date,
    };
  });

  osm.forEach((unit, index) => {
    if (usedOsm.has(index)) return;
    rows.push({
      siiir_code: null,
      parent_siiir_code: null,
      osm_ref: unit.osmRef,
      name: unit.name,
      levels: unit.levels,
      ownership: unit.ownership,
      teaching_languages: null,
      address_text: null,
      lng: unit.location.lng,
      lat: unit.location.lat,
      location_precision: 'osm',
      match_status: 'osm_only',
      source_date: null,
    });
  });

  return rows;
}

export function matchSummary(rows: readonly InstitutionRow[]): Record<string, number> {
  return {
    institutions: rows.length,
    matched: rows.filter((row) => row.match_status === 'matched').length,
    siiir_only: rows.filter((row) => row.match_status === 'siiir_only').length,
    osm_only: rows.filter((row) => row.match_status === 'osm_only').length,
    excluded: rows.filter((row) => row.match_status === 'excluded').length,
    unplaced: rows.filter((row) => row.match_status === 'siiir_only' && row.lng === null).length,
  };
}
