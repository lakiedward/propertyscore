import { reachableStep, useBookingStore } from './booking.store';

const HOME = {
  addressText: 'Str. Școlii 12',
  cityId: 'c1',
  latitude: 45.75,
  longitude: 21.22,
  propertyType: 'apartment',
  areaM2: 76,
  yearBuilt: null,
  floor: 3,
  buildingFloors: 8,
} as const;

describe('booking.store', () => {
  beforeEach(() => {
    useBookingStore.getState().reset();
  });

  it('opens each step only after the one before it', () => {
    const state = useBookingStore.getState();
    expect(reachableStep(state)).toBe(1);
    state.chooseHome({ kind: 'new' }, null);
    expect(reachableStep(useBookingStore.getState())).toBe(2);
    useBookingStore.getState().saveHome(HOME);
    expect(reachableStep(useBookingStore.getState())).toBe(3);
    useBookingStore.getState().pickStart('2026-11-21T07:30:00.000Z');
    expect(reachableStep(useBookingStore.getState())).toBe(4);
  });

  it('forgets the chosen hour when the city changes or another home is chosen', () => {
    const state = useBookingStore.getState();
    state.chooseHome({ kind: 'new' }, null);
    state.saveHome(HOME);
    state.pickStart('2026-11-21T07:30:00.000Z');
    useBookingStore.getState().saveHome({ ...HOME, cityId: 'c2' });
    expect(useBookingStore.getState().startsAt).toBeNull();
    useBookingStore.getState().pickStart('2026-11-21T07:30:00.000Z');
    useBookingStore.getState().chooseHome({ kind: 'listing', listingId: 'l1' }, null);
    expect(useBookingStore.getState()).toMatchObject({ home: null, startsAt: null });
  });

  it('drops the hour and remembers it was taken', () => {
    useBookingStore.getState().pickStart('2026-11-21T07:30:00.000Z');
    useBookingStore.getState().markStartTaken();
    expect(useBookingStore.getState()).toMatchObject({ startsAt: null, isStartTaken: true });
  });
});
