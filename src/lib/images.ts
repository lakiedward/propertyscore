const WEBP_QUALITY = 0.85;

export function canvasBlob(canvas: HTMLCanvasElement, type = 'image/webp'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('The browser could not encode the image'));
        }
      },
      type,
      WEBP_QUALITY,
    );
  });
}

export function drawingContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('The browser has no 2D canvas');
  }
  return context;
}

export function scaledWebp(bitmap: ImageBitmap, maxEdge: number): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  drawingContext(canvas).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvasBlob(canvas);
}
