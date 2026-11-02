import { supabase } from '@/lib/supabase/client';

const LISTING_PHOTOS_BUCKET = 'listing-photos';
const LISTING_THUMB_FILENAME = 'thumb.webp';

export function getListingPhotoUrl(path: string): string {
  return supabase.storage.from(LISTING_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
}

function toListingThumbPath(photoPath: string): string {
  const folderEnd = photoPath.lastIndexOf('/');
  return `${photoPath.slice(0, folderEnd + 1)}${LISTING_THUMB_FILENAME}`;
}

export function getListingThumbUrl(photoPath: string): string {
  return getListingPhotoUrl(toListingThumbPath(photoPath));
}
