import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { USER_STATE_FILTERS, UsersPage } from '@/features/staff';
import { loadFeatureNamespaces } from '@/i18n/i18n';
import { Constants } from '@/lib/supabase/database.types';

const usersSearchSchema = z.object({
  q: z.string().max(100).catch('').default(''),
  role: z.enum(Constants.public.Enums.app_role).optional().catch(undefined),
  state: z.enum(USER_STATE_FILTERS).catch('all').default('all'),
});

export const Route = createFileRoute('/_authenticated/admin/users')({
  validateSearch: usersSearchSchema,
  beforeLoad: () => loadFeatureNamespaces(['staff']),
  head: panelPageHead('panel.admin.nav.users'),
  component: UsersPage,
});
