export const GREEN_OSM_FILTERS = [
  'nwr/leisure=park,garden,nature_reserve,playground,dog_park,pitch',
  'wr/landuse=forest,grass,recreation_ground,village_green',
  'wr/natural=wood',
] as const;

export type GreenAreaKind = 'park' | 'garden' | 'forest' | 'square' | 'recreation' | 'other';

export type GreenAmenity = 'playground' | 'dog_park' | 'sports';

export type GreenOsmClass =
  | { type: 'area'; kind: GreenAreaKind; isPublic: boolean }
  | { type: 'amenity'; amenity: GreenAmenity };

const PRIVATE_ACCESS = new Set(['private', 'no', 'customers', 'permit']);

const AMENITIES: Record<string, GreenAmenity> = {
  playground: 'playground',
  dog_park: 'dog_park',
  pitch: 'sports',
};

function areaKind(tags: Record<string, string>): GreenAreaKind | null {
  if (tags.leisure === 'park') return 'park';
  if (tags.leisure === 'garden') return 'garden';
  if (tags.landuse === 'forest' || tags.natural === 'wood') return 'forest';
  if (tags.landuse === 'recreation_ground') return 'recreation';
  if (tags.landuse === 'village_green') return 'square';
  if (tags.landuse === 'grass' || tags.leisure === 'nature_reserve') return 'other';
  return null;
}

export function classifyGreenFeature(tags: Record<string, string>): GreenOsmClass | null {
  const amenity = tags.leisure === undefined ? undefined : AMENITIES[tags.leisure];
  if (amenity) return { type: 'amenity', amenity };
  const kind = areaKind(tags);
  if (!kind) return null;
  const access = tags.access ?? '';
  const isPublic = !PRIVATE_ACCESS.has(access) && tags['garden:type'] !== 'residential';
  return { type: 'area', kind, isPublic };
}
