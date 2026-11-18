import { server } from '@/test/msw/server';
import { listingTileUrl, warmFirstListingTiles } from './listings.tiles';

describe('listings.tiles', () => {
  afterEach(() => {
    server.events.removeAllListeners();
  });

  it('builds the tile address with the zoom placeholders and the filters', () => {
    const url = new URL(listingTileUrl({ transaction: 'rent', maxPrice: 600 }));

    expect(url.pathname).toBe('/rest/v1/rpc/listing_map_tile');
    expect(decodeURIComponent(url.search)).toBe(
      '?p_z={z}&p_x={x}&p_y={y}&p_transaction=rent&p_max_price_eur=600',
    );
  });

  it('leaves the price cap out when none is chosen', () => {
    expect(listingTileUrl({ transaction: 'sale', maxPrice: undefined })).not.toContain(
      'p_max_price_eur',
    );
  });

  it('asks once for every tile of the first screen, as vector tiles', async () => {
    const requests: Request[] = [];
    server.events.on('request:start', ({ request }) => {
      requests.push(request);
    });

    warmFirstListingTiles(listingTileUrl({ transaction: 'sale', maxPrice: undefined }), {
      innerWidth: 1440,
      innerHeight: 900,
    });

    await vi.waitFor(() => {
      expect(requests).toHaveLength(6);
    });
    const tiles = requests.map((request) => new URL(request.url).searchParams);
    expect(tiles.map((params) => params.get('p_z'))).toEqual(['6', '6', '6', '6', '6', '6']);
    expect(requests.every((request) => request.headers.get('Accept'))).toBe(true);
    expect(requests[0]?.headers.get('Accept')).toBe('application/vnd.mapbox-vector-tile');
    expect(requests[0]?.headers.get('apikey')).toBeTruthy();
  });
});
