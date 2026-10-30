import { createFileRoute } from '@tanstack/react-router';
import { PasswordResetPage } from '@/features/auth';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_public/password-reset/')({
  head: () => ({ meta: [{ title: pageTitle(i18n.t('auth:passwordReset.pageTitle')) }] }),
  component: PasswordResetPage,
});
