import { createFileRoute, redirect } from '@tanstack/react-router';
import { PasswordResetPage } from '@/features/auth';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';
import { safeRedirectPath } from '@/lib/url';

export const Route = createFileRoute('/_public/password-reset/')({
  beforeLoad: ({ context }) => {
    if (context.auth.session) {
      throw redirect({ href: safeRedirectPath(undefined) });
    }
  },
  head: () => ({ meta: [{ title: pageTitle(i18n.t('auth:passwordReset.pageTitle')) }] }),
  component: PasswordResetPage,
});
