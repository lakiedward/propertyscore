import { setupServer } from 'msw/node';
import { authHandlers } from './handlers/auth';
import { favoriteHandlers } from './handlers/favorites';
import { geoHandlers, listingHandlers, listingMapHandlers } from './handlers/listings';
import { moderationHandlers } from './handlers/moderation';
import { myListingHandlers } from './handlers/my-listings';
import { profileHandlers } from './handlers/profile';

export const server = setupServer(
  ...authHandlers,
  ...profileHandlers,
  ...moderationHandlers,
  ...myListingHandlers,
  ...favoriteHandlers,
  ...listingHandlers,
  ...listingMapHandlers,
  ...geoHandlers,
);
