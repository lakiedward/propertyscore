import type { TrustKind } from '@/components/trust/trust.utils';
import type { MapRegionArea, MapRegions } from '@/components/map/map-canvas';
import type { LngLatBounds } from '@/components/map/map.config';
import type { MapTilePin } from '@/components/map/use-map-listing-tiles';
import type { ListingBounds, ListingVerification } from './listing.types';

export function toTrustKind(verification: ListingVerification): TrustKind {
  if (verification === 'smartcheck') {
    return 'online';
  }
  return verification;
}

const BOUNDS_STEP = 10_000;

export function toListingBounds([[west, south], [east, north]]: LngLatBounds): ListingBounds {
  return {
    west: Math.floor(west * BOUNDS_STEP) / BOUNDS_STEP,
    south: Math.floor(south * BOUNDS_STEP) / BOUNDS_STEP,
    east: Math.ceil(east * BOUNDS_STEP) / BOUNDS_STEP,
    north: Math.ceil(north * BOUNDS_STEP) / BOUNDS_STEP,
  };
}

export function sameListingBounds(
  left: ListingBounds | undefined,
  right: ListingBounds | undefined,
): boolean {
  return (
    right !== undefined &&
    left?.west === right.west &&
    left.south === right.south &&
    left.east === right.east &&
    left.north === right.north
  );
}

export function moveId(ids: readonly string[], id: string, targetIndex: number): string[] {
  const rest = ids.filter((candidate) => candidate !== id);
  if (rest.length === ids.length) {
    return [...ids];
  }
  const index = Math.min(Math.max(targetIndex, 0), rest.length);
  return [...rest.slice(0, index), id, ...rest.slice(index)];
}

const EWKB_SRID_FLAG = 0x20000000;
const EWKB_POINT_TYPE = 1;

export function parseEwkbPoint(hex: string): [number, number] | null {
  if (!/^[0-9a-fA-F]+$/u.test(hex) || hex.length % 2 !== 0) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  const view = new DataView(bytes.buffer);
  if (bytes.length < 21) {
    return null;
  }
  const isLittleEndian = view.getUint8(0) === 1;
  const type = view.getUint32(1, isLittleEndian);
  if ((type & 0xff) !== EWKB_POINT_TYPE) {
    return null;
  }
  const offset = type & EWKB_SRID_FLAG ? 9 : 5;
  if (bytes.length < offset + 16) {
    return null;
  }
  return [view.getFloat64(offset, isLittleEndian), view.getFloat64(offset + 8, isLittleEndian)];
}

export function toTilePin(listing: {
  id: string;
  longitude: number;
  latitude: number;
  price: number;
  currency: string;
}): MapTilePin {
  return {
    id: listing.id,
    position: [listing.longitude, listing.latitude],
    price: listing.price,
    currency: listing.currency,
  };
}

type RegionShapes = {
  outline: MapRegions['outline'];
  regions: readonly { id: string; name: string; coordinates: MapRegionArea['coordinates'] }[];
};

export function toMapRegions({
  shapes,
  counties,
  selectedId,
  labelOf,
}: {
  shapes: RegionShapes;
  counties: readonly { county_id: string; listing_count: number }[];
  selectedId: string | undefined;
  labelOf: (region: { id: string; name: string }, count: number) => string;
}): Omit<MapRegions, 'onSelect'> {
  const counts = new Map(counties.map((county) => [county.county_id, county.listing_count]));
  const busiest = Math.max(1, ...counts.values());
  return {
    outline: shapes.outline,
    areas: shapes.regions.map((region) => {
      const count = counts.get(region.id) ?? 0;
      return {
        id: region.id,
        coordinates: region.coordinates,
        weight: count / busiest,
        label: labelOf(region, count),
      };
    }),
    selectedId,
  };
}

type GalleryListing = {
  id: string;
  photo_path: string | null;
  photos: readonly { id: string; path: string }[];
};

export function listingPhotos({ id, photo_path, photos }: GalleryListing) {
  if (photos.length > 0 || photo_path === null) {
    return photos;
  }
  return [{ id, path: photo_path }];
}
