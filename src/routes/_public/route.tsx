import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AuthLayout, useAuth } from '@/features/auth';
import { LanguageSwitcher } from '@/features/profile';

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
});

function PublicLayout() {
  const { user } = useAuth();

  return (
    <AuthLayout
      languageSwitcher={<LanguageSwitcher userId={user?.id} variant="segmented" tone="light" />}
    >
      <Outlet />
    </AuthLayout>
  );
}
