import { setupServer } from 'msw/node';
import { authHandlers } from './handlers/auth';
import { onlineReportHandlers } from './handlers/online-reports';
import { profileHandlers } from './handlers/profile';

export const server = setupServer(...authHandlers, ...profileHandlers, ...onlineReportHandlers);
