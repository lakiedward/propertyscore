import { setupServer } from 'msw/node';
import { authHandlers } from './handlers/auth';
import { favoriteHandlers } from './handlers/favorites';
import { inspectionHandlers } from './handlers/inspections';
import { geoHandlers, listingHandlers, listingMapHandlers } from './handlers/listings';
import { smartCheckHandlers } from './handlers/smart-check';
import { moderationHandlers } from './handlers/moderation';
import { myListingHandlers } from './handlers/my-listings';
import { profileHandlers } from './handlers/profile';
import { inspectionFormHandlers } from './handlers/inspection-form';
import { availabilityHandlers, staffHandlers } from './handlers/staff';

export const server = setupServer(
  ...authHandlers,
  ...profileHandlers,
  ...moderationHandlers,
  ...myListingHandlers,
  ...favoriteHandlers,
  ...listingHandlers,
  ...smartCheckHandlers,
  ...listingMapHandlers,
  ...geoHandlers,
  ...staffHandlers,
  ...inspectionFormHandlers,
  ...availabilityHandlers,
  ...inspectionHandlers,
);
