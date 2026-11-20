import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { PendingPage } from '@/components/layout/pending-page';
import { BookingConfirmationPage, inspectionQueries } from '@/features/inspections';
import { i18n, loadFeatureNamespaces } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';
import { AppError } from '@/lib/errors';

export const Route = createFileRoute('/_site/inspection/confirmation/$inspectionId')({
  beforeLoad: async ({ context, location }) => {
    if (!context.auth.user) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    await loadFeatureNamespaces(['inspections']);
  },
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.query({
        ...inspectionQueries.booked(params.inspectionId),
        staleTime: 'static',
      });
    } catch (error) {
      if (error instanceof AppError && error.code === 'not_found') {
        throw notFound();
      }
      throw error;
    }
  },
  head: () => ({
    meta: [{ title: pageTitle(i18n.t('inspections:booking.confirmation.pageTitle')) }],
  }),
  pendingComponent: PendingPage,
  component: BookingConfirmationPage,
});
