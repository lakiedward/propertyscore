import { useEffect, type ReactNode } from 'react';
import { mapCanvasStubControl } from './map-canvas-control';

type LngLat = [number, number];

type MapCanvasStubProps = {
  label: string;
  onError: () => void;
  markers?: readonly { id: string; node: ReactNode }[];
  onViewportChange?: (viewport: { bounds: [LngLat, LngLat]; zoom: number }) => void;
  listingTiles?: {
    pinLabel: (price: number, currency: string) => string;
    onPinHover: (pin: (typeof mapCanvasStubControl.tilePins)[number] | undefined) => void;
    onPinSelect: (pin: (typeof mapCanvasStubControl.tilePins)[number]) => void;
  };
};

const STUB_VIEW: [LngLat, LngLat] = [
  [20.26, 43.62],
  [29.7, 48.27],
];

export function MapCanvas({
  label,
  onError,
  markers = [],
  onViewportChange,
  listingTiles,
}: MapCanvasStubProps) {
  const shouldFail = mapCanvasStubControl.shouldFail;

  useEffect(() => {
    if (shouldFail) {
      onError();
    }
  }, [shouldFail, onError]);

  useEffect(() => {
    onViewportChange?.({ bounds: STUB_VIEW, zoom: 6 });
  }, [onViewportChange]);

  return (
    <div role="region" aria-label={label}>
      {listingTiles
        ? mapCanvasStubControl.tilePins.map((pin) => (
            <button
              key={pin.id}
              type="button"
              onClick={() => {
                listingTiles.onPinSelect(pin);
              }}
              onMouseEnter={() => {
                listingTiles.onPinHover(pin);
              }}
            >
              {listingTiles.pinLabel(pin.price, pin.currency)}
            </button>
          ))
        : null}
      {markers.map((marker) => (
        <span key={marker.id}>{marker.node}</span>
      ))}
    </div>
  );
}
