import { EraserIcon } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { canvasBlob, drawingContext } from '@/lib/images';
import { cn } from '@/lib/utils';

const PAD_HEIGHT = 180;
const STROKE_WIDTH = 2.4;

type SignaturePadProps = {
  label: string;
  areaLabel: string;
  placeholder: string;
  clearLabel: string;
  signer: string;
  isDisabled?: boolean;
  onChange: (signature: Blob | null) => void;
};

export function SignaturePad({
  label,
  areaLabel,
  placeholder,
  clearLabel,
  signer,
  isDisabled = false,
  onChange,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasStrokes, setHasStrokes] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(PAD_HEIGHT * ratio);
      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = STROKE_WIDTH;
      context.strokeStyle = getComputedStyle(canvas).color;
      setHasStrokes(false);
      onChange(null);
    };
    resize();
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
    };
  }, [onChange]);

  const pointOf = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (isDisabled) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    lastPoint.current = pointOf(event);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const from = lastPoint.current;
    if (!from || isDisabled) {
      return;
    }
    const to = pointOf(event);
    const context = drawingContext(event.currentTarget);
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    lastPoint.current = to;
    setHasStrokes(true);
  };

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!lastPoint.current) {
      return;
    }
    lastPoint.current = null;
    if (hasStrokes) {
      void canvasBlob(event.currentTarget, 'image/png').then(onChange);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    drawingContext(canvas).clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-label">{label}</span>
      <div className="relative">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={areaLabel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={cn(
            'block h-45 w-full touch-none rounded-lg border-(length:--border-width-control) border-border-strong bg-card text-foreground',
            isDisabled && 'opacity-70',
          )}
        />
        {hasStrokes ? null : (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 grid place-items-center text-small text-muted-foreground"
          >
            {placeholder}
          </span>
        )}
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 bottom-2 text-meta text-muted-foreground"
        >
          {signer}
        </span>
      </div>
      {isDisabled ? null : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          disabled={!hasStrokes}
          onClick={clear}
        >
          <EraserIcon aria-hidden />
          {clearLabel}
        </Button>
      )}
    </div>
  );
}
