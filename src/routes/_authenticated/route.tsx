import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { authQueries } from '@/features/auth';
import { useSyncProfileLocale } from '@/features/profile';

const PROFILE_COMPLETION_PATH = '/account/settings';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const { user } = context.auth;
    if (!user) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    const phone = await context.queryClient.query({
      ...authQueries.accountPhone(user.id),
      staleTime: 'static',
    });
    if (phone === null && location.pathname.replace(/\/$/u, '') !== PROFILE_COMPLETION_PATH) {
      throw redirect({ to: PROFILE_COMPLETION_PATH, search: { redirect: location.href } });
    }
    return { user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  useSyncProfileLocale(user.id);

  return <Outlet />;
}
