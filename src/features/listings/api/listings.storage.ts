import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';

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

export function listingPhotoPath(ownerId: string, listingId: string, photoId: string): string {
  return `${ownerId}/${listingId}/${photoId}.webp`;
}

export async function uploadListingFile(path: string, file: Blob, isReplace = false) {
  const { error } = await supabase.storage
    .from(LISTING_PHOTOS_BUCKET)
    .upload(path, file, { contentType: 'image/webp', upsert: isReplace });
  if (error) throw toAppError(error);
}

export async function uploadListingThumb(photoPath: string, thumb: Blob) {
  await uploadListingFile(toListingThumbPath(photoPath), thumb, true);
}

export async function removeListingFile(path: string) {
  const { error } = await supabase.storage.from(LISTING_PHOTOS_BUCKET).remove([path]);
  if (error) throw toAppError(error);
}

export async function downloadListingFile(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(LISTING_PHOTOS_BUCKET).download(path);
  if (error) throw toAppError(error);
  return data;
}
