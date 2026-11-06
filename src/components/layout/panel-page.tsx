import { useTranslation } from 'react-i18next';
import type { PanelPageKey } from './panel-page-head';

type PanelPageProps = {
  titleKey: PanelPageKey;
};

export function PanelPage({ titleKey }: PanelPageProps) {
  const { t } = useTranslation();

  return <h1 className="sr-only">{t(titleKey)}</h1>;
}
