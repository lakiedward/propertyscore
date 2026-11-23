import { createFileRoute } from '@tanstack/react-router';
import { CheckPage, checkSearchSchema } from '@/features/smart-check';
import { i18n, loadFeatureNamespaces } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_site/check')({
  validateSearch: checkSearchSchema,
  beforeLoad: () => loadFeatureNamespaces(['smartCheck']),
  head: () => ({ meta: [{ title: pageTitle(i18n.t('smartCheck:check.pageTitle')) }] }),
  component: CheckRoute,
});

function CheckRoute() {
  const { step = 'address' } = Route.useSearch();
  return <CheckPage step={step} />;
}
