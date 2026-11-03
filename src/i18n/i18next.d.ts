import 'i18next';
import type { resources } from './i18n';
import type roOnlineReports from './locales/ro/onlineReports.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof resources)['ro'] & {
      onlineReports: typeof roOnlineReports;
    };
  }
}
