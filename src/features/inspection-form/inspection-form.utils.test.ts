import {
  isSameOrder,
  moveItem,
  moveItemTo,
  orderByIds,
  nextConsentVersion,
  nextFormVersion,
  parseWeight,
  questionWeightTotals,
  toVersionItems,
  weightSum,
} from './inspection-form.utils';

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

  it('moves an item to another position and ignores positions outside the list', () => {
    expect(moveItemTo(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItemTo(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    expect(moveItemTo(['a', 'b', 'c'], 1, 5)).toEqual(['a', 'b', 'c']);
  });

  it('orders items by a list of ids and keeps unknown ones last', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(orderByIds(items, ['c', 'a']).map((item) => item.id)).toEqual(['c', 'a', 'b']);
    expect(isSameOrder(items, ['a', 'b', 'c'])).toBe(true);
    expect(isSameOrder(items, ['b', 'a', 'c'])).toBe(false);
    expect(isSameOrder(items, ['a', 'b'])).toBe(false);
  });

  it('gives the number a restored version gets, reusing the draft it replaces', () => {
    expect(
      nextConsentVersion([
        { version: 1.1, status: 'published' },
        { version: 1, status: 'archived' },
      ]),
    ).toBe(1.2);
    expect(
      nextConsentVersion([
        { version: 1.2, status: 'draft' },
        { version: 1.1, status: 'published' },
      ]),
    ).toBe(1.2);
    expect(nextConsentVersion([])).toBe(1);
    expect(
      nextFormVersion([
        { version: 2, status: 'published' },
        { version: 1, status: 'archived' },
      ]),
    ).toBe(3);
    expect(nextFormVersion([{ version: 3, status: 'draft' }])).toBe(3);
  });

  it('lists versions with their label and the inspections that used them', () => {
    const items = toVersionItems(
      [
        {
          id: 'a',
          version: 2,
          status: 'archived',
          published_at: '2026-09-01T00:00:00Z',
          archived_at: '2026-11-25T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
        },
        {
          id: 'b',
          version: 3,
          status: 'draft',
          published_at: null,
          archived_at: null,
          updated_at: '2026-11-25T00:00:00Z',
        },
      ],
      { a: 4 },
      (version) => `v${String(version)}`,
    );
    expect(items.map((item) => [item.label, item.status, item.inspectionCount])).toEqual([
      ['v2', 'archived', 4],
      ['v3', 'draft', 0],
    ]);
  });

  it('adds up the question weights of each category', () => {
    expect(
      questionWeightTotals([
        { category_id: 'a', weight: 60 },
        { category_id: 'a', weight: 30 },
        { category_id: 'b', weight: 100 },
      ]),
    ).toEqual({ a: 90, b: 100 });
  });
});
