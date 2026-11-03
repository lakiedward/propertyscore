import { useEffect } from 'react';
import { mapCanvasStubControl } from './map-canvas-control';

type MapCanvasStubProps = {
  label: string;
  onError: () => void;
};

export function MapCanvas({ label, onError }: MapCanvasStubProps) {
  const shouldFail = mapCanvasStubControl.shouldFail;

  useEffect(() => {
    if (shouldFail) {
      onError();
    }
  }, [shouldFail, onError]);

  return <div role="region" aria-label={label} />;
}
