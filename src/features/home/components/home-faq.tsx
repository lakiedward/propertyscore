import { useTranslation } from 'react-i18next';
import { FaqSection } from '@/components/layout/faq-section';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';
import { useBrandNames } from '../hooks/use-brand-names';

export function HomeFaq() {
  const { t } = useTranslation('home');
  const brands = useBrandNames();
  const items = t('faq.items', {
    returnObjects: true,
    ...brands,
    physicalPrice: formatPrice(SERVICE_PRICES.physical.amount, SERVICE_PRICES.physical.currency),
    smartCheckPrice: formatPrice(
      SERVICE_PRICES.smartCheck.amount,
      SERVICE_PRICES.smartCheck.currency,
    ),
  });

  return (
    <FaqSection
      id={HOME_SECTION.questions}
      title={
        <>
          <span className="block">{t('faq.titleLead')}</span>
          <span className="block text-muted-foreground">{t('faq.titleAccent')}</span>
        </>
      }
      items={items}
      density="compact"
    />
  );
}
