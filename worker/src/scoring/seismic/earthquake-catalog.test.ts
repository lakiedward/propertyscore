import { describe, expect, it } from 'vitest';

import { createEarthquakeCatalog } from './earthquake-catalog.ts';

const QUERY = { longitude: 21.18007, latitude: 45.72912 };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createEarthquakeCatalog', () => {
  it('asks both catalogues around the address and parses their events', async () => {
    const urls: string[] = [];
    const catalog = createEarthquakeCatalog((input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      urls.push(url);
      if (url.includes('usgs.gov')) {
        return Promise.resolve(
          jsonResponse({
            features: [
              {
                properties: {
                  mag: 5.5,
                  place: '1 km SW of Ciacova, Romania',
                  time: 691656580000,
                  type: 'earthquake',
                },
                geometry: { coordinates: [21.12, 45.5, 10] },
              },
            ],
          }),
        );
      }
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    const result = await catalog.near(QUERY);
    expect(result.usgs).toHaveLength(1);
    expect(result.usgs[0]?.place).toBe('Ciacova');
    expect(result.emsc).toEqual([]);
    const usgs = new URL(urls.find((url) => url.includes('usgs.gov')) ?? '');
    expect(usgs.searchParams.get('maxradiuskm')).toBe('65');
    expect(usgs.searchParams.get('minmagnitude')).toBe('3.5');
    const emsc = new URL(urls.find((url) => url.includes('seismicportal.eu')) ?? '');
    expect(emsc.searchParams.get('lat')).toBe('45.72912');
    expect(emsc.searchParams.get('maxradius')).toBe('0.585');
  });

  it('fails with a code when a catalogue answers an error', async () => {
    const catalog = createEarthquakeCatalog(() => Promise.resolve(jsonResponse({}, 503)));
    await expect(catalog.near(QUERY)).rejects.toMatchObject({
      code: 'earthquake_catalogue_failed',
    });
  });
});
