import { useEffect, useRef, useState } from 'react';
import type { MapViewport } from '@/components/map/map-canvas';
import { ROMANIA_BOUNDS } from '@/config/listings-explorer';
import type { ListingBounds } from '../listing.types';
import { containsBounds, sameListingBounds, toListingBounds } from '../listing.utils';

const SETTLE_MS = 250;

function boundsOfViewport(viewport: MapViewport): ListingBounds | undefined {
  return containsBounds(viewport.bounds, ROMANIA_BOUNDS)
    ? undefined
    : toListingBounds(viewport.bounds);
}

export function useDebouncedBounds() {
  const [bounds, setBounds] = useState<ListingBounds>();
  const timer = useRef<number | undefined>(undefined);
  const hasViewport = useRef(false);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  const handleViewportChange = (viewport: MapViewport) => {
    const next = boundsOfViewport(viewport);
    window.clearTimeout(timer.current);
    if (!hasViewport.current) {
      hasViewport.current = true;
      setBounds(next);
      return;
    }
    timer.current = window.setTimeout(() => {
      setBounds((current) => (next && sameListingBounds(current, next) ? current : next));
    }, SETTLE_MS);
  };

  return { bounds, handleViewportChange };
}
