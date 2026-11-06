import { createFileRoute } from '@tanstack/react-router';
import { authSearchSchema, SignUpPage, signedInRedirect } from '@/features/auth';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_public/sign-up')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ context, search }) => {
    const signedIn = signedInRedirect(context.auth, search.redirect);
    if (signedIn) {
      throw signedIn;
    }
  },
  head: () => ({ meta: [{ title: pageTitle(i18n.t('auth:signUp.pageTitle')) }] }),
  component: SignUpPage,
});
