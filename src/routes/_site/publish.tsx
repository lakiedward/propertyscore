import { createFileRoute } from '@tanstack/react-router';
import { PublishPage, publishSearchSchema } from '@/features/publish';
import { i18n, loadFeatureNamespaces } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_site/publish')({
  validateSearch: publishSearchSchema,
  beforeLoad: () => loadFeatureNamespaces(['publish']),
  head: () => ({ meta: [{ title: pageTitle(i18n.t('publish:pageTitle')) }] }),
  component: PublishPage,
});
