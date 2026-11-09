import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';

const LISTING_PHOTOS_BUCKET = 'listing-photos';
const IMMUTABLE_CACHE_SECONDS = '31536000';

type PhotoVariant = 'medium' | 'thumb';

export type ListingPhotoFiles = {
  full: Blob;
  medium: Blob;
  thumb: Blob;
};

function variantPath(photoPath: string, variant: PhotoVariant): string {
  return photoPath.replace(/\.webp$/u, `-${variant}.webp`);
}

function photoFilePaths(photoPath: string): string[] {
  return [photoPath, variantPath(photoPath, 'medium'), variantPath(photoPath, 'thumb')];
}

export function getListingPhotoUrl(path: string): string {
  return supabase.storage.from(LISTING_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function getListingThumbUrl(photoPath: string): string {
  return getListingPhotoUrl(variantPath(photoPath, 'thumb'));
}

export function getListingMediumUrl(photoPath: string): string {
  return getListingPhotoUrl(variantPath(photoPath, 'medium'));
}

export function isInListingFolder(photoPath: string, listingId: string): boolean {
  return photoPath.split('/')[1] === listingId;
}

export function listingPhotoPath(ownerId: string, listingId: string, photoId: string): string {
  return `${ownerId}/${listingId}/${photoId}.webp`;
}

export async function removeListingPhotoFiles(photoPath: string) {
  const { error } = await supabase.storage
    .from(LISTING_PHOTOS_BUCKET)
    .remove(photoFilePaths(photoPath));
  if (error) throw toAppError(error);
}

export async function uploadListingPhotoFiles(photoPath: string, files: ListingPhotoFiles) {
  const uploads: [string, Blob][] = [
    [photoPath, files.full],
    [variantPath(photoPath, 'medium'), files.medium],
    [variantPath(photoPath, 'thumb'), files.thumb],
  ];
  for (const [path, file] of uploads) {
    const { error } = await supabase.storage.from(LISTING_PHOTOS_BUCKET).upload(path, file, {
      contentType: 'image/webp',
      cacheControl: IMMUTABLE_CACHE_SECONDS,
    });
    if (error) {
      await removeListingPhotoFiles(photoPath).catch(() => undefined);
      throw toAppError(error);
    }
  }
}
