import { TriangleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatList } from '@/i18n/format';
import { CHECK_CITIES } from '../check.utils';

export function CheckOutsideNotice() {
  const { t } = useTranslation('smartCheck');

  return (
    <Alert tone="warning">
      <TriangleAlertIcon aria-hidden />
      <AlertTitle className="font-bold">{t('check.address.outside.title')}</AlertTitle>
      <AlertDescription>
        {t('check.address.outside.description', {
          cities: formatList(CHECK_CITIES.map((city) => city.name)),
        })}
      </AlertDescription>
    </Alert>
  );
}
