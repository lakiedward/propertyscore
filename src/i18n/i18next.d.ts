import 'i18next';
import type { resources } from './i18n';
import type roHome from './locales/ro/home.json';
import type roListings from './locales/ro/listings.json';
import type roPublish from './locales/ro/publish.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof resources)['ro'] & {
      home: typeof roHome;
      listings: typeof roListings;
      publish: typeof roPublish;
    };
  }
}
