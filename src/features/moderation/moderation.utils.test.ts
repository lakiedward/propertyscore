import { buildReviewListing } from '@/test/factories/moderation';
import {
  dayBucket,
  decisionMessage,
  listingChanges,
  pricePerSquareMeter,
} from './moderation.utils';

describe('moderation.utils', () => {
  const now = new Date(2026, 10, 6, 12, 0);

  it('groups a time as today, yesterday or an earlier date', () => {
    expect(dayBucket(new Date(2026, 10, 6, 0, 5), now)).toBe('today');
    expect(dayBucket(new Date(2026, 10, 5, 23, 59), now)).toBe('yesterday');
    expect(dayBucket(new Date(2026, 10, 4, 12, 0), now)).toBe('date');
  });

  it('rounds the price per square metre and refuses an empty area', () => {
    expect(pricePerSquareMeter(168000, 90)).toBe(1867);
    expect(pricePerSquareMeter(1000, 0)).toBeNull();
  });

  it('joins the reason messages into one note', () => {
    expect(decisionMessage(['Unu.', 'Doi.'])).toBe('Unu. Doi.');
  });

  it('names what changed between the published listing and its revision', () => {
    const original = buildReviewListing();
    const revision = {
      ...original,
      price: original.price + 5000,
      heating: 'heat_pump' as const,
      photos: [...original.photos].reverse(),
    };

    expect(listingChanges(revision, original)).toEqual(['price', 'extras', 'photos']);
    expect(listingChanges(original, original)).toEqual([]);
  });
});
