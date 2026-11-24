import { moveItem, parseWeight, weightSum } from './inspection-form.utils';

describe('inspection form utils', () => {
  it('keeps only the digits of a weight and caps it at 100', () => {
    expect(parseWeight('15%')).toBe(15);
    expect(parseWeight('')).toBe(0);
    expect(parseWeight('250')).toBe(100);
    expect(weightSum([15, 15, 70])).toBe(100);
  });

  it('moves an item within the list and stays inside its bounds', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });
});
