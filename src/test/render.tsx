import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { AuthContext, type AuthState } from '@/features/auth';
import { changeLocale, type Locale } from '@/i18n/i18n';
import type { RouterContext } from '@/routes/__root';
import { signedOut } from './factories/auth';

type RenderOptions = {
  locale?: Locale;
  auth?: AuthState;
  path?: string;
};

export async function renderWithProviders(ui: ReactNode, options: RenderOptions = {}) {
  const { locale = 'ro', auth = signedOut, path = '/' } = options;
  await changeLocale(locale);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const rootRoute = createRootRouteWithContext<RouterContext>()({ component: Outlet });
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '$',
    component: () => ui,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([pageRoute]),
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient, auth },
  });
  await router.load();

  const user = userEvent.setup();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <AuthContext value={auth}>
        <RouterProvider router={router} />
      </AuthContext>
    </QueryClientProvider>,
  );

  return { ...view, user, router, queryClient };
}
