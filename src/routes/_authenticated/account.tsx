import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_authenticated/account')({
  head: () => ({ meta: [{ title: pageTitle(i18n.t('account.pageTitle')) }] }),
  component: AccountPage,
});

function AccountPage() {
  const { t } = useTranslation();
  const { user } = Route.useRouteContext();

  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-h2">{t('account.title')}</h1>
      <p className="text-muted-foreground">{t('account.description', { email: user.email })}</p>
    </section>
  );
}
