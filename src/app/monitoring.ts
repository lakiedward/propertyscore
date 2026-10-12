import * as Sentry from '@sentry/react';
import { env } from '@/config/env';
import { currentLocale, i18n } from '@/i18n/i18n';
import type { createAppRouter } from './router';

const TRACES_SAMPLE_RATE = 0.1;

export function initMonitoring(router: ReturnType<typeof createAppRouter>) {
  if (!env.VITE_SENTRY_DSN) {
    return;
  }
  Sentry.init({
    dsn: env.VITE_SENTRY_DSN,
    environment: env.VITE_APP_ENV,
    integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
    tracesSampleRate: TRACES_SAMPLE_RATE,
  });
  Sentry.setTag('locale', currentLocale());
  i18n.on('languageChanged', () => {
    Sentry.setTag('locale', currentLocale());
  });
}
