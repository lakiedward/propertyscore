import { createFileRoute, redirect } from '@tanstack/react-router';
import { authSearchSchema, LoginPage } from '@/features/auth';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';
import { safeRedirectPath } from '@/lib/url';

export const Route = createFileRoute('/_public/login')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.auth.session) {
      throw redirect({ href: safeRedirectPath(search.redirect) });
    }
  },
  head: () => ({ meta: [{ title: pageTitle(i18n.t('auth:login.pageTitle')) }] }),
  component: LoginPage,
});
