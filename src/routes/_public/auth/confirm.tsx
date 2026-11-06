import { createFileRoute } from '@tanstack/react-router';
import { AuthConfirmPage, authConfirmSearchSchema, authQueries } from '@/features/auth';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_public/auth/confirm')({
  validateSearch: authConfirmSearchSchema,
  loaderDeps: ({ search }) => ({ token_hash: search.token_hash, type: search.type }),
  loader: ({ context, deps }) =>
    context.queryClient.query({ ...authQueries.emailLink(deps), staleTime: 'static' }),
  head: () => ({ meta: [{ title: pageTitle(i18n.t('auth:confirm.pageTitle')) }] }),
  component: AuthConfirmPage,
});
