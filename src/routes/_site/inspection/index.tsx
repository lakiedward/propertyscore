import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { BOOKING_STEPS, BookingPage } from '@/features/inspections';
import { i18n, loadFeatureNamespaces } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

const bookingSearchSchema = z.object({
  step: z.literal(BOOKING_STEPS).catch(1).default(1),
});

export const Route = createFileRoute('/_site/inspection/')({
  validateSearch: bookingSearchSchema,
  beforeLoad: () => loadFeatureNamespaces(['inspections']),
  head: () => ({ meta: [{ title: pageTitle(i18n.t('inspections:booking.pageTitle')) }] }),
  component: BookingPage,
});
