import { createFileRoute, redirect } from '@tanstack/react-router';
import { isRecentLinkSignIn, NewPasswordPage } from '@/features/auth';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_public/password-reset/new')({
  beforeLoad: ({ context }) => {
    if (context.auth.session && !isRecentLinkSignIn(context.auth.signInMethod)) {
      throw redirect({ to: '/account/settings' });
    }
  },
  head: () => ({ meta: [{ title: pageTitle(i18n.t('auth:newPassword.pageTitle')) }] }),
  component: NewPasswordPage,
});
