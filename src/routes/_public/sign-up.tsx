import { createFileRoute, redirect } from '@tanstack/react-router';
import { SignUpPage } from '@/features/auth';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_public/sign-up')({
  beforeLoad: ({ context }) => {
    if (context.auth.session) {
      throw redirect({ to: '/account' });
    }
  },
  head: () => ({ meta: [{ title: pageTitle(i18n.t('auth:signUp.pageTitle')) }] }),
  component: SignUpPage,
});
