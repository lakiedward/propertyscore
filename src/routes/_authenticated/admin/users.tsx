import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { staffQueries, USER_STATE_FILTERS, UsersPage } from '@/features/staff';
import { loadFeatureNamespaces } from '@/i18n/i18n';
import { Constants } from '@/lib/supabase/database.types';

const usersSearchSchema = z.object({
  q: z.string().max(100).catch('').default(''),
  role: z.enum(Constants.public.Enums.app_role).optional().catch(undefined),
  state: z.enum(USER_STATE_FILTERS).catch('all').default('all'),
  city: z.uuid().optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/admin/users')({
  validateSearch: usersSearchSchema,
  loaderDeps: ({ search }) => ({ role: search.role, state: search.state, city: search.city }),
  beforeLoad: () => loadFeatureNamespaces(['staff', 'listings', 'myListings']),
  loader: ({ context, deps, location }) => {
    const search = usersSearchSchema.parse(location.search);
    void context.queryClient
      .infiniteQuery(
        staffQueries.users({
          search: search.q,
          role: deps.role ?? null,
          state: deps.state,
          cityId: deps.city ?? null,
        }),
      )
      .catch(() => undefined);
    void context.queryClient.query(staffQueries.roleCounts()).catch(() => undefined);
    void context.queryClient.query(staffQueries.cities()).catch(() => undefined);
  },
  head: panelPageHead('panel.admin.nav.users'),
  component: UsersPage,
});
