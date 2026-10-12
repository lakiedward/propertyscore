import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { lazy, Suspense, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AppCrash } from '@/components/layout/app-crash';
import { Toaster } from '@/components/ui/sonner';
import { env } from '@/config/env';
import { AuthProvider, useAuth } from '@/features/auth';
import { i18n } from '@/i18n/i18n';
import type { createAppRouter } from './router';

const QueryDevtools = env.isDevBuild
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((module) => ({
        default: module.ReactQueryDevtools,
      })),
    )
  : null;

type AppProps = {
  queryClient: QueryClient;
  router: ReturnType<typeof createAppRouter>;
};

function RoutedApp({ router }: Pick<AppProps, 'router'>) {
  const auth = useAuth();

  useEffect(() => {
    void router.invalidate();
  }, [router, auth.session]);

  useEffect(() => {
    const handleLanguageChanged = () => {
      void router.invalidate();
    };
    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [router]);

  return <RouterProvider router={router} context={{ auth }} />;
}

export function App({ queryClient, router }: AppProps) {
  return (
    <ErrorBoundary FallbackComponent={AppCrash}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RoutedApp router={router} />
        </AuthProvider>
        <Toaster />
        {QueryDevtools ? (
          <Suspense>
            <QueryDevtools />
          </Suspense>
        ) : null}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
