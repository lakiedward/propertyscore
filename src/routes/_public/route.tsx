import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AuthLayout } from '@/features/auth';
import { LanguageSwitcher } from '@/features/profile';

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
});

function PublicLayout() {
  return (
    <AuthLayout languageSwitcher={<LanguageSwitcher variant="segmented" tone="light" />}>
      <Outlet />
    </AuthLayout>
  );
}
