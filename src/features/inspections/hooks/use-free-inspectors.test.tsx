import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { AdminInspection } from '../inspection.types';
import { buildAdminInspection } from '@/test/factories/admin-inspection';
import { adminInspectionsResponse, MIHAI_ID, TIMISOARA_ID } from '@/test/msw/handlers/inspections';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { useFreeInspectors } from './use-free-inspectors';

const ELENA_ID = 'a0000000-0000-4000-8000-000000000006';

const INSPECTORS = [
  { user_id: MIHAI_ID, full_name: 'Mihai Dobre' },
  { user_id: ELENA_ID, full_name: 'Elena Matei' },
].map((inspector) => ({
  ...inspector,
  phone: null,
  city_id: TIMISOARA_ID,
  city_name: 'Timișoara',
  is_active: true,
}));

type FreeInspectorsProps = {
  inspection: AdminInspection;
};

function FreeInspectors({ inspection }: FreeInspectorsProps) {
  const { free, isLoading } = useFreeInspectors(inspection);
  if (isLoading) {
    return null;
  }
  return (
    <ul>
      {free.map((inspector) => (
        <li key={inspector.user_id}>{inspector.full_name}</li>
      ))}
    </ul>
  );
}

describe('useFreeInspectors', () => {
  it('offers only the inspectors who work then and have no visit at that time', async () => {
    const booking = buildAdminInspection();
    const busy = buildAdminInspection({
      starts_at: booking.starts_at,
      ends_at: booking.ends_at,
      inspector_id: ELENA_ID,
      inspector_name: 'Elena Matei',
      status: 'inspector_assigned',
    });
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/admin_inspectors'), () => HttpResponse.json(INSPECTORS)),
      http.get(supabaseUrl('/rest/v1/inspector_weekly_hours'), () =>
        HttpResponse.json(
          [MIHAI_ID, ELENA_ID].flatMap((inspectorId) =>
            [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
              inspector_id: inspectorId,
              weekday,
              starts_at: '06:00:00',
              ends_at: '22:00:00',
            })),
          ),
        ),
      ),
      adminInspectionsResponse([booking, busy]),
    );
    await renderWithProviders(<FreeInspectors inspection={booking} />);

    expect(await screen.findByText('Mihai Dobre')).toBeInTheDocument();
    expect(screen.queryByText('Elena Matei')).not.toBeInTheDocument();
  });
});
