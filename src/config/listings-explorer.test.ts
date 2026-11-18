import mapTilesMigration from '../../supabase/migrations/20261113141316_create_listing_map_tiles.sql?raw';
import { EXPLORER_PRICE_CAPS, isExplorerPriceCap } from './listings-explorer';

function migrationCaps(transaction: string): number[] {
  const rows = [...mapTilesMigration.matchAll(/\('(sale|rent)', (\d+), (\d+)\)/g)];
  return rows
    .filter(([, rowTransaction]) => rowTransaction === transaction)
    .sort(([, , left], [, , right]) => Number(left) - Number(right))
    .map(([, , , maxPrice]) => Number(maxPrice));
}

describe('EXPLORER_PRICE_CAPS', () => {
  it('offers the same price caps as the database counts the map with', () => {
    expect(migrationCaps('sale')).toEqual(EXPLORER_PRICE_CAPS.sale);
    expect(migrationCaps('rent')).toEqual(EXPLORER_PRICE_CAPS.rent);
  });

  it('accepts only a cap offered for the chosen transaction', () => {
    expect(isExplorerPriceCap('sale', 100_000)).toBe(true);
    expect(isExplorerPriceCap('rent', 100_000)).toBe(false);
    expect(isExplorerPriceCap('sale', 123)).toBe(false);
    expect(isExplorerPriceCap('sale', undefined)).toBe(false);
  });
});
