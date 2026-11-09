import { useEffect, type ReactNode } from 'react';
import { mapCanvasStubControl } from './map-canvas-control';

type MapCanvasStubProps = {
  label: string;
  onError: () => void;
  clusters?: {
    points: readonly { id: string }[];
    renderPoint: (id: string) => ReactNode;
  };
};

export function MapCanvas({ label, onError, clusters }: MapCanvasStubProps) {
  const shouldFail = mapCanvasStubControl.shouldFail;

  useEffect(() => {
    if (shouldFail) {
      onError();
    }
  }, [shouldFail, onError]);

  return (
    <div role="region" aria-label={label}>
      {clusters?.points.map((point) => (
        <span key={point.id}>{clusters.renderPoint(point.id)}</span>
      ))}
    </div>
  );
}
