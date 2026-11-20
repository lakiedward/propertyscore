import { useBookingStore } from '../booking.store';
import { InspectionDatePicker } from './inspection-date-picker';

type BookingStepDateProps = {
  cityId: string;
  cityName: string;
};

export function BookingStepDate({ cityId, cityName }: BookingStepDateProps) {
  const startsAt = useBookingStore((state) => state.startsAt);
  const isStartTaken = useBookingStore((state) => state.isStartTaken);
  const pickStart = useBookingStore((state) => state.pickStart);

  return (
    <InspectionDatePicker
      cityId={cityId}
      cityName={cityName}
      startsAt={startsAt}
      isStartTaken={isStartTaken}
      onPick={pickStart}
    />
  );
}
