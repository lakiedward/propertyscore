import { useTranslation } from 'react-i18next';

export function useBrandNames() {
  const { t } = useTranslation();
  return { physical: t('brand.physical'), smartCheck: t('brand.smartcheck') };
}
