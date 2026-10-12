import '@/styles/globals.css';
import '@/i18n/i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/app';
import { initMonitoring } from '@/app/monitoring';
import { createQueryClient } from '@/app/query-client';
import { createAppRouter } from '@/app/router';

const queryClient = createQueryClient();
const router = createAppRouter(queryClient);

initMonitoring(router);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('The #root element is missing from index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App queryClient={queryClient} router={router} />
  </StrictMode>,
);
