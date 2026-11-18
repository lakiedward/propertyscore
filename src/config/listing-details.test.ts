import { LISTING_DETAIL_FIELDS, LISTING_DETAIL_SELECT } from './listing-details';

describe('LISTING_DETAIL_SELECT', () => {
  it('selects exactly the listing detail fields', () => {
    expect(LISTING_DETAIL_SELECT).toBe(LISTING_DETAIL_FIELDS.join(', '));
  });
});
