import { useTranslation } from 'react-i18next';
import { MAIN_CONTENT_ID } from './main-content-id';

export function SkipLink() {
  const { t } = useTranslation();

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only z-200 rounded-md bg-primary px-4 py-3 text-label text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      {t('site.skipToContent')}
    </a>
  );
}
