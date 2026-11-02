import { useTranslation } from 'react-i18next';
import { FaqSection } from '@/components/layout/faq-section';
import { PUBLISH_SECTION } from '@/components/layout/site-navigation';

export function PublishFaq() {
  const { t } = useTranslation('publish');

  return (
    <FaqSection
      id={PUBLISH_SECTION.questions}
      title={t('faq.title')}
      items={t('faq.items', { returnObjects: true })}
      density="comfortable"
    />
  );
}
