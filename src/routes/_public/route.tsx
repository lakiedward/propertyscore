import { createFileRoute, Outlet } from '@tanstack/react-router';
import { CenteredLayout } from '@/components/layout/centered-layout';
import { LanguageSwitcher } from '@/features/profile';

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
});

function PublicLayout() {
  return (
    <CenteredLayout actions={<LanguageSwitcher />}>
      <Outlet />
    </CenteredLayout>
  );
}
