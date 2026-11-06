import { createFileRoute } from '@tanstack/react-router';
import { authSearchSchema, LoginPage, signedInRedirect } from '@/features/auth';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_public/login')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ context, search }) => {
    const signedIn = signedInRedirect(context.auth, search.redirect);
    if (signedIn) {
      throw signedIn;
    }
  },
  head: () => ({ meta: [{ title: pageTitle(i18n.t('auth:login.pageTitle')) }] }),
  component: LoginPage,
});
