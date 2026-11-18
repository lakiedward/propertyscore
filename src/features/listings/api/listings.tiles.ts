import { LISTING_TILE_ZOOMS } from '@/components/map/map.config';
import { tilesInView } from '@/components/map/map.utils';
import { env } from '@/config/env';
import { EXPLORER_MAP_LAYOUT, ROMANIA_BOUNDS } from '@/config/listings-explorer';
import type { ListingTransaction } from '../listing.types';

const TILE_FUNCTION_PATH = '/rest/v1/rpc/listing_map_tile';
const TILE_MEDIA_TYPE = 'application/vnd.mapbox-vector-tile';

export const LISTING_TILE_HEADERS: Readonly<Record<string, string>> = {
  apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
  Accept: TILE_MEDIA_TYPE,
};

export function listingTileUrl({
  transaction,
  maxPrice,
}: {
  transaction: ListingTransaction;
  maxPrice: number | undefined;
}): string {
  const params = new URLSearchParams({ p_transaction: transaction });
  if (maxPrice !== undefined) {
    params.set('p_max_price_eur', String(maxPrice));
  }
  return `${env.VITE_SUPABASE_URL}${TILE_FUNCTION_PATH}?p_z={z}&p_x={x}&p_y={y}&${params.toString()}`;
}

function listingTileUrlAt(template: string, tile: { z: number; x: number; y: number }) {
  return template
    .replace('{z}', String(tile.z))
    .replace('{x}', String(tile.x))
    .replace('{y}', String(tile.y));
}

export function warmFirstListingTiles(
  template: string,
  window: { innerWidth: number; innerHeight: number },
) {
  const viewport = {
    width: window.innerWidth,
    height: Math.max(
      window.innerHeight - EXPLORER_MAP_LAYOUT.headerOffset,
      EXPLORER_MAP_LAYOUT.minHeight,
    ),
  };
  for (const tile of tilesInView(
    ROMANIA_BOUNDS,
    viewport,
    EXPLORER_MAP_LAYOUT.boundsPadding,
    LISTING_TILE_ZOOMS,
  )) {
    void fetch(listingTileUrlAt(template, tile), { headers: { ...LISTING_TILE_HEADERS } }).catch(
      () => undefined,
    );
  }
}
