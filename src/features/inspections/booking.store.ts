import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BookingAccess, BookingHome, HomeFormValues } from './booking.schemas';
import type { PaymentMethod } from './inspection.types';

export type HomeChoice =
  | { kind: 'property'; propertyId: string; listingId: string | null }
  | { kind: 'listing'; listingId: string }
  | { kind: 'new' };

type BookingState = {
  choice: HomeChoice | null;
  prefill: HomeFormValues | null;
  home: BookingHome | null;
  startsAt: string | null;
  isStartTaken: boolean;
  access: BookingAccess | null;
  paymentMethod: PaymentMethod;
  chooseHome: (choice: HomeChoice, prefill: HomeFormValues | null) => void;
  saveHome: (home: BookingHome) => void;
  pickStart: (startsAt: string | null) => void;
  markStartTaken: () => void;
  saveAccess: (access: BookingAccess) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  reset: () => void;
};

const EMPTY = {
  choice: null,
  prefill: null,
  home: null,
  startsAt: null,
  isStartTaken: false,
  access: null,
  paymentMethod: 'card',
} as const satisfies Partial<BookingState>;

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      ...EMPTY,
      chooseHome: (choice, prefill) => {
        set((state) =>
          JSON.stringify(state.choice) === JSON.stringify(choice)
            ? { choice }
            : { choice, prefill, home: null, startsAt: null },
        );
      },
      saveHome: (home) => {
        set((state) => ({
          home,
          startsAt: home.cityId === state.home?.cityId ? state.startsAt : null,
        }));
      },
      pickStart: (startsAt) => {
        set({ startsAt, isStartTaken: false });
      },
      markStartTaken: () => {
        set({ startsAt: null, isStartTaken: true });
      },
      saveAccess: (access) => {
        set({ access });
      },
      setPaymentMethod: (paymentMethod) => {
        set({ paymentMethod });
      },
      reset: () => {
        set(EMPTY);
      },
    }),
    {
      name: 'ps-inspection-booking',
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ choice, prefill, home, startsAt, access, paymentMethod }) => ({
        choice,
        prefill,
        home,
        startsAt,
        access,
        paymentMethod,
      }),
    },
  ),
);

export const BOOKING_STEPS = [1, 2, 3, 4, 5] as const;

export type BookingStep = (typeof BOOKING_STEPS)[number];

export function reachableStep(
  state: Pick<BookingState, 'choice' | 'home' | 'startsAt' | 'access'>,
): BookingStep {
  if (!state.choice) {
    return 1;
  }
  if (!state.home) {
    return 2;
  }
  if (!state.startsAt) {
    return 3;
  }
  return state.access ? 5 : 4;
}

export const PREVIOUS_STEP = { 1: null, 2: 1, 3: 2, 4: 3, 5: 4 } as const satisfies Record<
  BookingStep,
  BookingStep | null
>;

export const NEXT_STEP = { 1: 2, 2: 3, 3: 4, 4: 5, 5: null } as const satisfies Record<
  BookingStep,
  BookingStep | null
>;
