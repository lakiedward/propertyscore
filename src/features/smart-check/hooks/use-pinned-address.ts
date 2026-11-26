import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { LngLat } from '@/components/map/map.config';
import { logger } from '@/lib/logger';
import { smartCheckQueries } from '../api/smart-check.queries';
import type { AddressMatch } from '../check.utils';

type ReverseState = 'idle' | 'resolving' | 'notFound' | 'failed';

type PinnedAddress = {
  address: string;
  pin: LngLat | null;
};

export function usePinnedAddress(initial: PinnedAddress) {
  const queryClient = useQueryClient();
  const [address, setAddressText] = useState(initial.address);
  const [pin, setPinPosition] = useState(initial.pin);
  const [reverseState, setReverseState] = useState<ReverseState>('idle');
  const [focusRequest, setFocusRequest] = useState(0);
  const requestId = useRef(0);

  const setAddress = (next: string) => {
    requestId.current += 1;
    setReverseState('idle');
    setAddressText(next);
  };

  const chooseMatch = (match: AddressMatch) => {
    requestId.current += 1;
    setReverseState('idle');
    setAddressText(match.label);
    setPinPosition(match.position);
    setFocusRequest((current) => current + 1);
  };

  const movePin = async (position: LngLat, shouldFocus = false) => {
    requestId.current += 1;
    const current = requestId.current;
    setPinPosition(position);
    if (shouldFocus) {
      setFocusRequest((value) => value + 1);
    }
    setReverseState('resolving');
    try {
      const match = await queryClient.query(smartCheckQueries.reverseAddress(position));
      if (current !== requestId.current) {
        return;
      }
      if (match) {
        setAddressText(match.label);
        setReverseState('idle');
      } else {
        setAddressText('');
        setReverseState('notFound');
      }
    } catch (error) {
      logger.warn('Reverse geocoding failed', { error });
      if (current === requestId.current) {
        setAddressText('');
        setReverseState('failed');
      }
    }
  };

  return { address, pin, reverseState, focusRequest, setAddress, chooseMatch, movePin };
}
