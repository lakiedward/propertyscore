import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/i18n/format';

export function useCardFacts() {
  const { t } = useTranslation('common');
  return (rooms: number | null, areaM2: number | null) =>
    rooms !== null && areaM2 !== null
      ? [
          t('listingSummary.facts.rooms', { count: rooms }),
          t('listingSummary.area', { value: formatNumber(areaM2) }),
        ].join(' · ')
      : undefined;
}
