import { setupServer } from 'msw/node';
import { authHandlers } from './handlers/auth';
import { listingHandlers } from './handlers/listings';
import { moderationHandlers } from './handlers/moderation';
import { onlineReportHandlers } from './handlers/online-reports';
import { profileHandlers } from './handlers/profile';

export const server = setupServer(
  ...authHandlers,
  ...profileHandlers,
  ...moderationHandlers,
  ...listingHandlers,
  ...onlineReportHandlers,
);
