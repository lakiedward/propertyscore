import { useTranslation } from 'react-i18next';
import { formatDate, formatNumber } from '@/i18n/format';
import type { BookingAccess, BookingHome } from '../booking.schemas';
import { visitEnd } from '../slots.utils';

const TIME = { hour: '2-digit', minute: '2-digit' } as const;

export function useBookingText() {
  const { t } = useTranslation('inspections');

  const addressLine = (address: string, cityName: string | undefined) =>
    cityName && !address.toLocaleLowerCase().includes(cityName.toLocaleLowerCase())
      ? t('booking.review.addressInCity', { address, city: cityName })
      : address;

  return {
    addressLine,
    address: (home: BookingHome, cityName: string | undefined) =>
      addressLine(home.addressText, cityName),
    facts: (home: BookingHome) => {
      const parts = [
        t(`propertyType.${home.propertyType}`),
        t('agenda.area', { area: formatNumber(home.areaM2) }),
      ];
      if (home.floor !== null && home.buildingFloors !== null) {
        parts.push(t('agenda.floor', { floor: home.floor, floors: home.buildingFloors }));
      }
      if (home.yearBuilt !== null) {
        parts.push(String(home.yearBuilt));
      }
      return parts.join(' · ');
    },
    date: (startsAt: string) =>
      t('booking.review.dateValue', {
        day: formatDate(startsAt, { weekday: 'long', day: 'numeric', month: 'short' }),
        from: formatDate(startsAt, TIME),
        to: formatDate(visitEnd(startsAt), TIME),
      }),
    opener: (access: BookingAccess, accountName: string, accountPhone: string | undefined) =>
      access.mode === 'self'
        ? [accountName, accountPhone].filter(Boolean).join(' · ')
        : [access.name, access.phone].filter(Boolean).join(' · '),
  };
}
