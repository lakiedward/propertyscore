import { findCoveredCity, toAddressMatch, withoutRepeatedPlaces } from './check.utils';

describe('check.utils', () => {
  it('finds the covered city around a point and nothing outside the nine cities', () => {
    expect(findCoveredCity([21.18007, 45.72912])?.slug).toBe('timisoara');
    expect(findCoveredCity([25.59077, 45.64249])).toBeUndefined();
  });

  it('builds the street line and the place from a Photon feature', () => {
    const match = toAddressMatch({
      geometry: { coordinates: [21.18007, 45.72912] },
      properties: {
        osm_id: 1,
        osm_type: 'W',
        countrycode: 'RO',
        street: 'Strada Freidorf',
        housenumber: '12',
        district: 'Freidorf',
        city: 'Timișoara',
        county: 'Timiș',
      },
    });

    expect(match.main).toBe('Strada Freidorf 12');
    expect(match.label).toBe('Strada Freidorf 12, Timișoara');
    expect(match.position).toEqual([21.18007, 45.72912]);
  });

  it('drops places Photon returns more than once', () => {
    const matches = withoutRepeatedPlaces([
      { id: '1', main: 'Strada Freidorf', sub: 'Timișoara', label: 'a', position: [21, 45] },
      { id: '2', main: 'strada freidorf', sub: 'Timișoara', label: 'b', position: [21.1, 45] },
      { id: '3', main: 'Strada Freidorf', sub: 'Lugoj', label: 'c', position: [21.2, 45] },
    ]);

    expect(matches.map(({ id }) => id)).toEqual(['1', '3']);
  });
});
