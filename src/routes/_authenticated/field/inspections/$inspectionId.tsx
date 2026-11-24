import { createFileRoute, notFound } from '@tanstack/react-router';
import { z } from 'zod';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { PendingPage } from '@/components/layout/pending-page';
import { fieldInspectionQueries, InspectionWorkspacePage } from '@/features/field-inspection';
import { loadFeatureNamespaces } from '@/i18n/i18n';
import { isAppError } from '@/lib/errors';

const workspaceSearchSchema = z.object({
  section: z.string().max(40).optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/field/inspections/$inspectionId')({
  validateSearch: workspaceSearchSchema,
  beforeLoad: () => loadFeatureNamespaces(['fieldInspection']),
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.query({
        ...fieldInspectionQueries.workspace(params.inspectionId),
        staleTime: 'static',
      });
    } catch (error) {
      if (isAppError(error) && (error.code === 'not_found' || error.code === 'validation')) {
        throw notFound();
      }
      throw error;
    }
  },
  head: panelPageHead('panel.field.nav.current'),
  pendingComponent: PendingPage,
  component: InspectionWorkspacePage,
});
