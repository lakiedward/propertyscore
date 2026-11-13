import { useEffect, type ReactNode } from 'react';
import { mapCanvasStubControl } from './map-canvas-control';

type LngLat = [number, number];

type MapCanvasStubProps = {
  label: string;
  onError: () => void;
  markers?: readonly { id: string; node: ReactNode }[];
  onViewportChange?: (viewport: { bounds: [LngLat, LngLat]; zoom: number }) => void;
  clusters?: {
    points: readonly { id: string }[];
    renderPoint: (id: string) => ReactNode;
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
  clusters,
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
      {clusters?.points.map((point) => (
        <span key={point.id}>{clusters.renderPoint(point.id)}</span>
      ))}
      {markers.map((marker) => (
        <span key={marker.id}>{marker.node}</span>
      ))}
    </div>
  );
}
