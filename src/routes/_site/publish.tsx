import { createFileRoute } from '@tanstack/react-router';
import { PublishPage } from '@/features/publish';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_site/publish')({
  head: () => ({ meta: [{ title: pageTitle(i18n.t('publish:pageTitle')) }] }),
  component: PublishPage,
});
