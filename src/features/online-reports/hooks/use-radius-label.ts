import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/i18n/format';

export function useRadiusLabel(): (radiusM: number) => string {
  const { t } = useTranslation('onlineReports');
  return (radiusM) =>
    radiusM >= 1000
      ? t('green.radius.km', { value: formatNumber(radiusM / 1000) })
      : t('green.radius.meters', { value: formatNumber(radiusM) });
}
