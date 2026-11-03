import { createFileRoute, redirect } from '@tanstack/react-router';
import { homePathFor, PasswordResetPage } from '@/features/auth';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_public/password-reset/')({
  beforeLoad: ({ context }) => {
    if (context.auth.session) {
      throw redirect({ href: homePathFor(context.auth.roles) });
    }
  },
  head: () => ({ meta: [{ title: pageTitle(i18n.t('auth:passwordReset.pageTitle')) }] }),
  component: PasswordResetPage,
});
