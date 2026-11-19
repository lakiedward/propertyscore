import { themeColor } from './map.theme';

export const PIN_BOX_HEIGHT = 29.5;

const PIN_FONT_SIZE = 14;
const PIN_FONT_WEIGHT = 800;
const PIN_PADDING_X = 12;
const PIN_RING = 3;
const PIN_TAIL_SIZE = 12;
const PIN_TAIL_CENTER_BELOW = 1;
const PIN_TAIL_RADIUS = 3;
const PIN_TAIL_RING_OFFSET = 3;
const PIN_SHADOW = { offsetY: 6, blur: 16, color: 'rgba(16, 63, 50, 0.38)' };
const PIN_IMAGE_PADDING = 26;

const BUBBLE_MEDIUM_FROM = 10;
const BUBBLE_LARGE_FROM = 40;
const BUBBLE_HALO = 5;
const BUBBLE_HALO_COLOR = 'rgba(16, 63, 50, 0.18)';
const BUBBLE_SHADOW = { offsetY: 6, blur: 14, color: 'rgba(16, 63, 50, 0.3)' };
const BUBBLE_FILL_ALPHA = 0.88;
const BUBBLE_IMAGE_PADDING = 22;

const FALLBACK_FONT_FAMILY = "'Manrope Variable', 'Segoe UI', Arial, sans-serif";

export type MapSymbolImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  pixelRatio: number;
};

function fontFamily(): string {
  return themeColor('--font-sans') || FALLBACK_FONT_FAMILY;
}

function bubbleFontWeight(): string {
  return themeColor('--font-weight-display') || '760';
}

function bubbleDiameter(count: number): number {
  if (count >= BUBBLE_LARGE_FROM) {
    return 60;
  }
  return count >= BUBBLE_MEDIUM_FROM ? 50 : 42;
}

function bubbleFontSize(count: number): number {
  return count >= BUBBLE_LARGE_FROM ? 16 : 14;
}

export function listingSymbolFonts(): string[] {
  const family = fontFamily();
  return [
    `${String(PIN_FONT_WEIGHT)} ${String(PIN_FONT_SIZE)}px ${family}`,
    `${bubbleFontWeight()} 14px ${family}`,
    `${bubbleFontWeight()} 16px ${family}`,
  ];
}

function createContext(width: number, height: number, pixelRatio: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * pixelRatio);
  canvas.height = Math.ceil(height * pixelRatio);
  const context = canvas.getContext('2d');
  context?.scale(pixelRatio, pixelRatio);
  return context;
}

function toImage(context: CanvasRenderingContext2D, pixelRatio: number): MapSymbolImage {
  const { width, height } = context.canvas;
  return {
    width,
    height,
    data: context.getImageData(0, 0, width, height).data,
    pixelRatio,
  };
}

function withShadow(
  context: CanvasRenderingContext2D,
  shadow: { offsetY: number; blur: number; color: string },
  draw: () => void,
) {
  context.save();
  context.shadowColor = shadow.color;
  context.shadowBlur = shadow.blur;
  context.shadowOffsetY = shadow.offsetY;
  draw();
  context.restore();
}

function pill(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, height / 2);
}

function tail(context: CanvasRenderingContext2D, centerX: number, centerY: number) {
  const half = PIN_TAIL_SIZE / 2;
  context.save();
  context.translate(centerX, centerY);
  context.rotate(Math.PI / 4);
  context.beginPath();
  context.roundRect(-half, -half, PIN_TAIL_SIZE, PIN_TAIL_SIZE, [0, 0, PIN_TAIL_RADIUS, 0]);
  context.fill();
  context.restore();
}

export function drawPinImage(label: string, pixelRatio: number): MapSymbolImage | undefined {
  const measure = createContext(1, 1, 1);
  if (!measure) {
    return undefined;
  }
  const font = `${String(PIN_FONT_WEIGHT)} ${String(PIN_FONT_SIZE)}px ${fontFamily()}`;
  measure.font = font;
  const boxWidth = Math.ceil(measure.measureText(label).width) + 2 * PIN_PADDING_X;
  const width = boxWidth + 2 * PIN_IMAGE_PADDING;
  const height = PIN_BOX_HEIGHT + 2 * PIN_IMAGE_PADDING;
  const context = createContext(width, height, pixelRatio);
  if (!context) {
    return undefined;
  }
  const left = PIN_IMAGE_PADDING;
  const top = PIN_IMAGE_PADDING;
  const centerX = left + boxWidth / 2;
  const tailCenterY = top + PIN_BOX_HEIGHT + PIN_TAIL_CENTER_BELOW;
  const brand = themeColor('--primary');
  const ring = themeColor('--card');

  context.fillStyle = ring;
  tail(context, centerX, tailCenterY + PIN_TAIL_RING_OFFSET * Math.SQRT2);
  context.fillStyle = brand;
  tail(context, centerX, tailCenterY);

  withShadow(context, PIN_SHADOW, () => {
    context.fillStyle = brand;
    pill(context, left, top, boxWidth, PIN_BOX_HEIGHT);
    context.fill();
  });
  context.fillStyle = ring;
  pill(
    context,
    left - PIN_RING,
    top - PIN_RING,
    boxWidth + 2 * PIN_RING,
    PIN_BOX_HEIGHT + 2 * PIN_RING,
  );
  context.fill();
  context.fillStyle = brand;
  pill(context, left, top, boxWidth, PIN_BOX_HEIGHT);
  context.fill();

  context.font = font;
  context.fillStyle = themeColor('--primary-foreground');
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, centerX, top + PIN_BOX_HEIGHT / 2);
  return toImage(context, pixelRatio);
}

export function drawBubbleImage(
  label: string,
  count: number,
  pixelRatio: number,
): MapSymbolImage | undefined {
  const diameter = bubbleDiameter(count);
  const size = diameter + 2 * BUBBLE_IMAGE_PADDING;
  const context = createContext(size, size, pixelRatio);
  if (!context) {
    return undefined;
  }
  const center = size / 2;
  const radius = diameter / 2;

  withShadow(context, BUBBLE_SHADOW, () => {
    context.fillStyle = BUBBLE_HALO_COLOR;
    context.beginPath();
    context.arc(center, center, radius + BUBBLE_HALO, 0, 2 * Math.PI);
    context.fill();
  });
  context.globalCompositeOperation = 'destination-out';
  context.beginPath();
  context.arc(center, center, radius, 0, 2 * Math.PI);
  context.fill();
  context.globalCompositeOperation = 'source-over';
  context.globalAlpha = BUBBLE_FILL_ALPHA;
  context.fillStyle = themeColor('--primary');
  context.beginPath();
  context.arc(center, center, radius, 0, 2 * Math.PI);
  context.fill();
  context.globalAlpha = 1;

  context.font = `${bubbleFontWeight()} ${String(bubbleFontSize(count))}px ${fontFamily()}`;
  context.fillStyle = themeColor('--primary-foreground');
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, center, center);
  return toImage(context, pixelRatio);
}
