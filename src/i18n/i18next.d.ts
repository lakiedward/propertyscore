import 'i18next';
import type { resources } from './i18n';
import type roFieldInspection from './locales/ro/fieldInspection.json';
import type roSmartCheck from './locales/ro/smartCheck.json';
import type roHome from './locales/ro/home.json';
import type roInspectionForm from './locales/ro/inspectionForm.json';
import type roInspections from './locales/ro/inspections.json';
import type roListings from './locales/ro/listings.json';
import type roModeration from './locales/ro/moderation.json';
import type roMyListings from './locales/ro/myListings.json';
import type roPublish from './locales/ro/publish.json';
import type roStaff from './locales/ro/staff.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof resources)['ro'] & {
      home: typeof roHome;
      smartCheck: typeof roSmartCheck;
      listings: typeof roListings;
      publish: typeof roPublish;
      moderation: typeof roModeration;
      myListings: typeof roMyListings;
      staff: typeof roStaff;
      inspections: typeof roInspections;
      inspectionForm: typeof roInspectionForm;
      fieldInspection: typeof roFieldInspection;
    };
  }
}
