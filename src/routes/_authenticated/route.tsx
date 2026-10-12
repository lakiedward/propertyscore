import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/app-shell';
import { SignOutButton } from '@/features/auth';
import { LanguageSwitcher, useSyncProfileLocale } from '@/features/profile';

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

  return (
    <AppShell
      actions={
        <>
          <LanguageSwitcher userId={user.id} />
          <SignOutButton />
        </>
      }
    >
      <Outlet />
    </AppShell>
  );
}
