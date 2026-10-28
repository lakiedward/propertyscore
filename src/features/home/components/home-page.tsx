import { useTranslation } from 'react-i18next';

export function HomePage() {
  const { t } = useTranslation();

  return <h1 className="sr-only">{t('app.name')}</h1>;
}
