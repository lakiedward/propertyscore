const PHOTO_MAX_EDGE = 1920;
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

export async function toListingPhoto(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  drawingContext(canvas).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvasBlob(canvas);
}

export async function toListingThumb(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const scale = Math.max(THUMB_WIDTH / bitmap.width, THUMB_HEIGHT / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  const canvas = document.createElement('canvas');
  canvas.width = THUMB_WIDTH;
  canvas.height = THUMB_HEIGHT;
  drawingContext(canvas).drawImage(
    bitmap,
    (THUMB_WIDTH - width) / 2,
    (THUMB_HEIGHT - height) / 2,
    width,
    height,
  );
  bitmap.close();
  return canvasBlob(canvas);
}
