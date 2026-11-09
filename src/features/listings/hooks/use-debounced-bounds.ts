import { useEffect, useRef, useState } from 'react';
import type { MapViewport } from '@/components/map/map-canvas';
import type { ListingBounds } from '../listing.types';
import { sameListingBounds, toListingBounds } from '../listing.utils';

const SETTLE_MS = 250;

export function useDebouncedBounds() {
  const [bounds, setBounds] = useState<ListingBounds>();
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  const handleViewportChange = (viewport: MapViewport) => {
    const next = toListingBounds(viewport.bounds);
    window.clearTimeout(timer.current);
    if (bounds === undefined) {
      setBounds(next);
      return;
    }
    timer.current = window.setTimeout(() => {
      setBounds((current) => (sameListingBounds(current, next) ? current : next));
    }, SETTLE_MS);
  };

  return { bounds, handleViewportChange };
}
