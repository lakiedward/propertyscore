import { createFileRoute } from '@tanstack/react-router';
import { NewPasswordPage } from '@/features/auth';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_public/password-reset/new')({
  head: () => ({ meta: [{ title: pageTitle(i18n.t('auth:newPassword.pageTitle')) }] }),
  component: NewPasswordPage,
});
