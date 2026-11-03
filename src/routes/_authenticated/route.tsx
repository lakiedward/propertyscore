import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useSyncProfileLocale } from '@/features/profile';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.user) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    return { user: context.auth.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  useSyncProfileLocale(user.id);

  return <Outlet />;
}
