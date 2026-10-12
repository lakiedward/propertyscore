import { i18n } from './i18n';

export function pageTitle(title?: string): string {
  const appName = i18n.t('app.name');
  return title ? `${title} · ${appName}` : appName;
}
