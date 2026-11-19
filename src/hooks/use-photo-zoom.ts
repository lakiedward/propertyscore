import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

type Point = { x: number; y: number };

type Size = { width: number; height: number };

type ZoomState = { scale: number; offset: Point; isAnimated: boolean };

type Gesture =
  | { kind: 'none' }
  | { kind: 'pan'; start: Point; startOffset: Point }
  | {
      kind: 'pinch';
      startDistance: number;
      startMidpoint: Point;
      startScale: number;
      startOffset: Point;
    };

type Tap = { time: number; point: Point };

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const BUTTON_STEP = 1.5;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
const TAP_TOLERANCE_PX = 10;
const WHEEL_SENSITIVITY = 0.002;
const PINCH_WHEEL_SENSITIVITY = 0.01;
const ORIGIN: Point = { x: 0, y: 0 };
const INITIAL_STATE: ZoomState = { scale: MIN_SCALE, offset: ORIGIN, isAnimated: false };

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function clampOffset(offset: Point, scale: number, viewport: Size, image: Size): Point {
  const maxX = Math.max(0, (image.width * scale - viewport.width) / 2);
  const maxY = Math.max(0, (image.height * scale - viewport.height) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  };
}

function zoomAround(
  scale: number,
  offset: Point,
  nextScale: number,
  point: Point,
): Pick<ZoomState, 'scale' | 'offset'> {
  const clamped = clampScale(nextScale);
  if (clamped === MIN_SCALE) {
    return { scale: MIN_SCALE, offset: ORIGIN };
  }
  const ratio = clamped / scale;
  return {
    scale: clamped,
    offset: {
      x: point.x - (point.x - offset.x) * ratio,
      y: point.y - (point.y - offset.y) * ratio,
    },
  };
}

function distance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function midpoint(first: Point, second: Point): Point {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function sizeOf(element: HTMLElement | null): Size {
  return { width: element?.offsetWidth ?? 0, height: element?.offsetHeight ?? 0 };
}

export function usePhotoZoom() {
  const [state, setState] = useState<ZoomState>(INITIAL_STATE);
  const viewportNode = useRef<HTMLDivElement | null>(null);
  const imageNode = useRef<HTMLImageElement | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture>({ kind: 'none' });
  const lastTap = useRef<Tap | null>(null);
  const tapStart = useRef<Point | null>(null);
  const live = useRef<ZoomState>(INITIAL_STATE);

  const toViewportPoint = (clientX: number, clientY: number): Point => {
    const rect = viewportNode.current?.getBoundingClientRect();
    if (!rect) {
      return ORIGIN;
    }
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
  };

  const apply = (next: Pick<ZoomState, 'scale' | 'offset'>, isAnimated: boolean) => {
    const offset = clampOffset(
      next.offset,
      next.scale,
      sizeOf(viewportNode.current),
      sizeOf(imageNode.current),
    );
    const nextState = { scale: next.scale, offset, isAnimated };
    live.current = nextState;
    setState(nextState);
  };

  const zoomBy = (factor: number, point: Point, isAnimated: boolean) => {
    const current = live.current;
    apply(zoomAround(current.scale, current.offset, current.scale * factor, point), isAnimated);
  };

  const attachViewport = (node: HTMLDivElement | null) => {
    viewportNode.current = node;
    if (!node) {
      return;
    }
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const sensitivity = event.ctrlKey ? PINCH_WHEEL_SENSITIVITY : WHEEL_SENSITIVITY;
      zoomBy(
        Math.exp(-event.deltaY * sensitivity),
        toViewportPoint(event.clientX, event.clientY),
        false,
      );
    };
    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      node.removeEventListener('wheel', handleWheel);
    };
  };

  const startGesture = () => {
    const points = [...pointers.current.values()];
    const [first, second] = points;
    const current = live.current;
    if (first && second) {
      gesture.current = {
        kind: 'pinch',
        startDistance: distance(first, second),
        startMidpoint: midpoint(first, second),
        startScale: current.scale,
        startOffset: current.offset,
      };
    } else if (first && current.scale > MIN_SCALE) {
      gesture.current = { kind: 'pan', start: first, startOffset: current.offset };
    } else {
      gesture.current = { kind: 'none' };
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toViewportPoint(event.clientX, event.clientY);
    pointers.current.set(event.pointerId, point);
    tapStart.current = pointers.current.size === 1 ? point : null;
    startGesture();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) {
      return;
    }
    const point = toViewportPoint(event.clientX, event.clientY);
    pointers.current.set(event.pointerId, point);
    if (tapStart.current && distance(tapStart.current, point) > TAP_TOLERANCE_PX) {
      tapStart.current = null;
    }
    const current = gesture.current;
    if (current.kind === 'pan') {
      apply(
        {
          scale: live.current.scale,
          offset: {
            x: current.startOffset.x + point.x - current.start.x,
            y: current.startOffset.y + point.y - current.start.y,
          },
        },
        false,
      );
    } else if (current.kind === 'pinch') {
      const [first, second] = [...pointers.current.values()];
      if (!first || !second || current.startDistance === 0) {
        return;
      }
      const center = midpoint(first, second);
      const zoomed = zoomAround(
        current.startScale,
        current.startOffset,
        current.startScale * (distance(first, second) / current.startDistance),
        current.startMidpoint,
      );
      apply(
        {
          scale: zoomed.scale,
          offset:
            zoomed.scale === MIN_SCALE
              ? ORIGIN
              : {
                  x: zoomed.offset.x + center.x - current.startMidpoint.x,
                  y: zoomed.offset.y + center.y - current.startMidpoint.y,
                },
        },
        false,
      );
    }
  };

  const handleTap = (point: Point) => {
    const now = performance.now();
    const previous = lastTap.current;
    if (
      previous &&
      now - previous.time < DOUBLE_TAP_MS &&
      distance(previous.point, point) < TAP_TOLERANCE_PX * 3
    ) {
      lastTap.current = null;
      const current = live.current;
      if (current.scale > MIN_SCALE) {
        apply({ scale: MIN_SCALE, offset: ORIGIN }, true);
      } else {
        apply(zoomAround(current.scale, current.offset, DOUBLE_TAP_SCALE, point), true);
      }
      return;
    }
    lastTap.current = { time: now, point };
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) {
      return;
    }
    const tap = tapStart.current;
    tapStart.current = null;
    if (event.type === 'pointerup' && tap && pointers.current.size === 0) {
      handleTap(tap);
    }
    startGesture();
  };

  const reset = () => {
    pointers.current.clear();
    gesture.current = { kind: 'none' };
    lastTap.current = null;
    live.current = INITIAL_STATE;
    setState(INITIAL_STATE);
  };

  return {
    scale: state.scale,
    offset: state.offset,
    isAnimated: state.isAnimated,
    isZoomed: state.scale > MIN_SCALE,
    canZoomIn: state.scale < MAX_SCALE,
    canZoomOut: state.scale > MIN_SCALE,
    zoomIn: () => {
      zoomBy(BUTTON_STEP, ORIGIN, true);
    },
    zoomOut: () => {
      zoomBy(1 / BUTTON_STEP, ORIGIN, true);
    },
    reset,
    attachViewport,
    attachImage: (node: HTMLImageElement | null) => {
      imageNode.current = node;
    },
    viewportHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerEnd,
      onPointerCancel: handlePointerEnd,
    },
  };
}
