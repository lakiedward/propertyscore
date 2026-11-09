import { setupServer } from 'msw/node';
import { authHandlers } from './handlers/auth';
import { geoHandlers, listingHandlers } from './handlers/listings';
import { moderationHandlers } from './handlers/moderation';
import { myListingHandlers } from './handlers/my-listings';
import { onlineReportHandlers } from './handlers/online-reports';
import { profileHandlers } from './handlers/profile';

export const server = setupServer(
  ...authHandlers,
  ...profileHandlers,
  ...moderationHandlers,
  ...myListingHandlers,
  ...listingHandlers,
  ...geoHandlers,
  ...onlineReportHandlers,
);
