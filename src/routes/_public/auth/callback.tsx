import { createFileRoute } from '@tanstack/react-router';
import { AuthCallbackPage, authCallbackSearchSchema, signedInRedirect } from '@/features/auth';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_public/auth/callback')({
  validateSearch: authCallbackSearchSchema,
  beforeLoad: ({ context, search }) => {
    const signedIn = signedInRedirect(context.auth, search.redirect);
    if (signedIn) {
      throw signedIn;
    }
  },
  head: () => ({ meta: [{ title: pageTitle(i18n.t('auth:callback.pageTitle')) }] }),
  component: AuthCallbackPage,
});
