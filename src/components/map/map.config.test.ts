import { boundsOf } from './map.config';

describe('boundsOf', () => {
  it('returns nothing for no points', () => {
    expect(boundsOf([])).toBeUndefined();
  });

  it('spans every point', () => {
    expect(
      boundsOf([
        [21.22, 45.75],
        [21.24, 45.74],
        [21.21, 45.76],
      ]),
    ).toEqual([
      [21.21, 45.74],
      [21.24, 45.76],
    ]);
  });
});
