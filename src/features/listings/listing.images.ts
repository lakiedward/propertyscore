import { canvasBlob, drawingContext, scaledWebp } from '@/lib/images';
import type { ListingPhotoFiles } from './api/listings.storage';

const FULL_MAX_EDGE = 1920;
const MEDIUM_MAX_EDGE = 640;
const THUMB_WIDTH = 240;
const THUMB_HEIGHT = 192;

export const LISTING_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

function cropped(bitmap: ImageBitmap, width: number, height: number): Promise<Blob> {
  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const drawnWidth = bitmap.width * scale;
  const drawnHeight = bitmap.height * scale;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawingContext(canvas).drawImage(
    bitmap,
    (width - drawnWidth) / 2,
    (height - drawnHeight) / 2,
    drawnWidth,
    drawnHeight,
  );
  return canvasBlob(canvas);
}

export async function toListingPhotoFiles(source: Blob): Promise<ListingPhotoFiles> {
  const bitmap = await createImageBitmap(source);
  try {
    const [full, medium, thumb] = await Promise.all([
      scaledWebp(bitmap, FULL_MAX_EDGE),
      scaledWebp(bitmap, MEDIUM_MAX_EDGE),
      cropped(bitmap, THUMB_WIDTH, THUMB_HEIGHT),
    ]);
    return { full, medium, thumb };
  } finally {
    bitmap.close();
  }
}
