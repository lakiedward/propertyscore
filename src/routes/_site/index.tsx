import { createFileRoute } from '@tanstack/react-router';
import { HomePage, homeSearchSchema } from '@/features/home';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_site/')({
  validateSearch: homeSearchSchema,
  head: () => ({ meta: [{ title: pageTitle() }] }),
  component: HomePage,
});
