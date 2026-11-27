import { useTranslation } from 'react-i18next';
import { formatDate, formatNumber } from '@/i18n/format';
import type { BookingAccess, BookingHome } from '../booking.schemas';
import type { PropertyType } from '../inspection.types';
import { knownAccessTags } from '../inspection.utils';
import { visitEnd } from '../slots.utils';

const TIME = { hour: '2-digit', minute: '2-digit' } as const;

const FACT_SEPARATOR = ' · ';

type PropertyFacts = {
  propertyType: PropertyType;
  areaM2: number | null;
  floor: number | null;
  buildingFloors: number | null;
  rooms?: number | null;
  yearBuilt?: number | null;
};

export function useBookingText() {
  const { t } = useTranslation('inspections');

  const addressLine = (address: string, cityName: string | undefined) =>
    cityName && !address.toLocaleLowerCase().includes(cityName.toLocaleLowerCase())
      ? t('booking.review.addressInCity', { address, city: cityName })
      : address;

  const factList = ({
    propertyType,
    areaM2,
    floor,
    buildingFloors,
    rooms = null,
    yearBuilt = null,
  }: PropertyFacts) => {
    const parts = [t(`propertyType.${propertyType}`)];
    if (rooms !== null) {
      parts.push(t('booking.home.rooms', { count: rooms }));
    }
    if (areaM2 !== null) {
      parts.push(t('agenda.area', { area: formatNumber(areaM2) }));
    }
    if (floor !== null && buildingFloors !== null) {
      parts.push(t('agenda.floor', { floor, floors: buildingFloors }));
    }
    if (yearBuilt !== null) {
      parts.push(String(yearBuilt));
    }
    return parts;
  };

  return {
    addressLine,
    factList,
    factLine: (facts: PropertyFacts) => factList(facts).join(FACT_SEPARATOR),
    accessNotes: (tags: readonly string[], notes: string | null) =>
      [
        ...knownAccessTags(tags).map((tag) => t(`accessTag.${tag}`)),
        ...(notes ? [notes] : []),
      ].join('. '),
    address: (home: BookingHome, cityName: string | undefined) =>
      addressLine(home.addressText, cityName),
    facts: (home: BookingHome) =>
      factList({
        propertyType: home.propertyType,
        areaM2: home.areaM2,
        floor: home.floor,
        buildingFloors: home.buildingFloors,
        yearBuilt: home.yearBuilt,
      }).join(FACT_SEPARATOR),
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
