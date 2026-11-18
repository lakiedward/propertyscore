import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { getRomaniaRegions } from './romania-regions.api';

const REGIONS_URL = '*/geo/romania-regions.json';

describe('getRomaniaRegions', () => {
  it('returns the outline and the regions', async () => {
    const regions = await getRomaniaRegions();

    expect(regions.regions.map((region) => region.id)).toEqual(['timis', 'bucuresti']);
  });

  it('reports a network failure as a network error', async () => {
    server.use(http.get(REGIONS_URL, () => HttpResponse.error()));

    await expect(getRomaniaRegions()).rejects.toMatchObject({ code: 'network' });
  });

  it('reports a refused request as an unknown error', async () => {
    server.use(http.get(REGIONS_URL, () => new HttpResponse(null, { status: 500 })));

    await expect(getRomaniaRegions()).rejects.toMatchObject({ code: 'unknown' });
  });

  it('reports a file that is not the regions as an unknown error', async () => {
    server.use(http.get(REGIONS_URL, () => HttpResponse.json({ outline: 'none' })));

    await expect(getRomaniaRegions()).rejects.toMatchObject({ code: 'unknown' });
  });

  it('reports a page that is not JSON as an unknown error', async () => {
    server.use(http.get(REGIONS_URL, () => HttpResponse.text('<html></html>')));

    await expect(getRomaniaRegions()).rejects.toMatchObject({ code: 'unknown' });
  });
});
