import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import {
  getListingMediumUrl,
  getListingPhotoUrl,
  getListingThumbUrl,
  uploadListingPhotoFiles,
} from './listings.storage';

const FOLDER = 'a0000000-0000-4000-8000-000000000001/b0000000-0000-4000-8000-000000000001';
const PHOTO_PATH = `${FOLDER}/cover.webp`;

function publicUrl(path: string) {
  return supabaseUrl(`/storage/v1/object/public/listing-photos/${path}`);
}

const FILES = {
  full: new Blob(['full'], { type: 'image/webp' }),
  medium: new Blob(['medium'], { type: 'image/webp' }),
  thumb: new Blob(['thumb'], { type: 'image/webp' }),
};

describe('listings storage', () => {
  it('builds the public URL of a listing photo and of its smaller files', () => {
    expect(getListingPhotoUrl(PHOTO_PATH)).toBe(publicUrl(PHOTO_PATH));
    expect(getListingMediumUrl(PHOTO_PATH)).toBe(publicUrl(`${FOLDER}/cover-medium.webp`));
    expect(getListingThumbUrl(PHOTO_PATH)).toBe(publicUrl(`${FOLDER}/cover-thumb.webp`));
  });

  it('uploads the three files of a photo under their own names', async () => {
    const uploaded: string[] = [];
    server.use(
      http.post(supabaseUrl('/storage/v1/object/listing-photos/*'), ({ request }) => {
        uploaded.push(decodeURIComponent(new URL(request.url).pathname));
        return HttpResponse.json({ Key: 'listing-photos/x' });
      }),
    );

    await uploadListingPhotoFiles(PHOTO_PATH, FILES);

    expect(uploaded).toEqual([
      `/storage/v1/object/listing-photos/${FOLDER}/cover.webp`,
      `/storage/v1/object/listing-photos/${FOLDER}/cover-medium.webp`,
      `/storage/v1/object/listing-photos/${FOLDER}/cover-thumb.webp`,
    ]);
  });

  it('removes what it already uploaded when one of the files fails', async () => {
    const removed: unknown[] = [];
    let uploads = 0;
    server.use(
      http.post(supabaseUrl('/storage/v1/object/listing-photos/*'), () => {
        uploads += 1;
        return uploads === 2
          ? HttpResponse.json(
              { statusCode: '500', error: 'Error', message: 'failed' },
              { status: 500 },
            )
          : HttpResponse.json({ Key: 'listing-photos/x' });
      }),
      http.delete(supabaseUrl('/storage/v1/object/listing-photos'), async ({ request }) => {
        removed.push(await request.json());
        return HttpResponse.json([]);
      }),
    );

    await expect(uploadListingPhotoFiles(PHOTO_PATH, FILES)).rejects.toThrow();

    expect(removed).toEqual([
      {
        prefixes: [
          `${FOLDER}/cover.webp`,
          `${FOLDER}/cover-medium.webp`,
          `${FOLDER}/cover-thumb.webp`,
        ],
      },
    ]);
  });
});
