import { supabaseUrl } from '@/test/msw/supabase-url';
import { getListingPhotoUrl, getListingThumbUrl } from './listings.storage';

const PHOTO_PATH =
  'a0000000-0000-4000-8000-000000000001/b0000000-0000-4000-8000-000000000001/cover.webp';

describe('listings storage', () => {
  it('builds the public URL of a listing photo', () => {
    expect(getListingPhotoUrl(PHOTO_PATH)).toBe(
      supabaseUrl(`/storage/v1/object/public/listing-photos/${PHOTO_PATH}`),
    );
  });

  it('points the thumbnail to thumb.webp in the photo folder', () => {
    expect(getListingThumbUrl(PHOTO_PATH)).toBe(
      supabaseUrl(
        '/storage/v1/object/public/listing-photos/a0000000-0000-4000-8000-000000000001/b0000000-0000-4000-8000-000000000001/thumb.webp',
      ),
    );
  });
});
