import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_authenticated/')({
  head: () => ({ meta: [{ title: pageTitle(i18n.t('home.pageTitle')) }] }),
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation();
  const { user } = Route.useRouteContext();

  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">{t('home.title')}</h1>
      <p className="text-muted-foreground">{t('home.description', { email: user.email })}</p>
    </section>
  );
}
