import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { authQueries, settingsPathFor } from '@/features/auth';
import { useSyncProfileLocale } from '@/features/profile';

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
    const settingsPath = settingsPathFor(context.auth.roles);
    if (phone === null && location.pathname.replace(/\/$/u, '') !== settingsPath) {
      throw redirect({ to: settingsPath, search: { redirect: location.href } });
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
