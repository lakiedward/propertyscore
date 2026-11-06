import type { ListingPhotoFiles } from './api/listings.storage';

const FULL_MAX_EDGE = 1920;
const MEDIUM_MAX_EDGE = 640;
const THUMB_WIDTH = 240;
const THUMB_HEIGHT = 192;
const WEBP_QUALITY = 0.85;

export const LISTING_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('The browser could not encode the photo'));
        }
      },
      'image/webp',
      WEBP_QUALITY,
    );
  });
}

function drawingContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('The browser has no 2D canvas');
  }
  return context;
}

function scaled(bitmap: ImageBitmap, maxEdge: number): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  drawingContext(canvas).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvasBlob(canvas);
}

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
      scaled(bitmap, FULL_MAX_EDGE),
      scaled(bitmap, MEDIUM_MAX_EDGE),
      cropped(bitmap, THUMB_WIDTH, THUMB_HEIGHT),
    ]);
    return { full, medium, thumb };
  } finally {
    bitmap.close();
  }
}
