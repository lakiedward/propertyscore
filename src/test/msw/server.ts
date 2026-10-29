import { setupServer } from 'msw/node';
import { authHandlers } from './handlers/auth';
import { listingHandlers } from './handlers/listings';
import { profileHandlers } from './handlers/profile';

export const server = setupServer(...authHandlers, ...profileHandlers, ...listingHandlers);
