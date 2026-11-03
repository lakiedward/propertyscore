import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/i18n/format';

export function useDistanceLabel(): (distanceM: number) => string {
  const { t } = useTranslation('onlineReports');
  return (distanceM) =>
    distanceM >= 1000
      ? t('green.radius.km', {
          value: formatNumber(distanceM / 1000, { maximumFractionDigits: 1 }),
        })
      : t('green.radius.meters', { value: formatNumber(Math.round(distanceM / 10) * 10) });
}
