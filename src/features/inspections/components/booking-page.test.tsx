import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import ro from '@/i18n/locales/ro/inspections.json';
import { signedInAs, signedOut } from '@/test/factories/auth';
import {
  bookablePropertiesResponse,
  slotsResponse,
  TIMISOARA_ID,
} from '@/test/msw/handlers/inspections';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';
import { useBookingStore } from '../booking.store';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const PROPERTY = {
  property_id: 'p1000000-0000-4000-8000-000000000001',
  listing_id: null,
  address_text: 'Str. Paris 3, ap. 9',
  city_id: TIMISOARA_ID,
  city_name: 'Timișoara',
  latitude: 45.75,
  longitude: 21.22,
  property_type: 'apartment',
  area_m2: 62,
  year_built: 1962,
  floor: 2,
  building_floors: 4,
  rooms: null,
  photo_path: null,
  last_inspection_at: null,
  listing_price: null,
  listing_currency: null,
  listing_status: null,
  listing_transaction: null,
};

const HOME = {
  addressText: 'Str. Paris 3, ap. 9',
  cityId: TIMISOARA_ID,
  latitude: 45.75,
  longitude: 21.22,
  propertyType: 'apartment',
  areaM2: 62,
  yearBuilt: 1962,
  floor: 2,
  buildingFloors: 4,
} as const;

function tomorrowAt(hour: number, minute: number) {
  const date = new Date();
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
    hour,
    minute,
  ).toISOString();
}

function continueTo(step: string) {
  return screen.getByRole('button', {
    name: ro.booking.summary.continue.replace('{{step}}', step),
  });
}

describe('BookingPage', { timeout: 20_000 }, () => {
  beforeEach(() => {
    sessionStorage.clear();
    useBookingStore.getState().reset();
  });

  it('asks a signed-out visitor to sign in and come back', async () => {
    await renderAppRoute('/inspection', { auth: signedOut });

    const main = await screen.findByRole('main');
    const signIn = await within(main).findByRole('link', {
      name: ro.booking.requester.signIn.login,
    });
    expect(signIn).toHaveAttribute('href', '/login?redirect=%2Finspection');
    expect(continueTo('locuința')).toBeDisabled();
  });

  it('prefills the home step from a chosen property', async () => {
    server.use(bookablePropertiesResponse([PROPERTY]));
    const { user } = await renderAppRoute('/inspection', { auth: signedInAs('user') });

    const picker = await screen.findByRole('radiogroup', { name: ro.booking.home.groupLabel });
    await user.click(within(picker).getByRole('radio', { name: /Str\. Paris 3/ }));
    await user.click(continueTo('locuința'));

    expect(await screen.findByLabelText(ro.booking.address.street)).toHaveValue(
      'Str. Paris 3, ap. 9',
    );
  });

  it('picks the first free hour on the date step', async () => {
    useBookingStore.getState().chooseHome({ kind: 'new' }, null);
    useBookingStore.getState().saveHome(HOME);
    server.use(
      slotsResponse([
        { starts_at: tomorrowAt(8, 0), working: 1, free: 0 },
        { starts_at: tomorrowAt(9, 30), working: 1, free: 1 },
      ]),
    );
    const { user } = await renderAppRoute('/inspection?step=3', { auth: signedInAs('user') });

    await user.click(await screen.findByRole('button', { name: /Prima oră liberă/ }));

    expect(useBookingStore.getState().startsAt).toBe(tomorrowAt(9, 30));
    expect(continueTo('acces')).toBeEnabled();
  });

  it('books with the reviewed details once the terms are accepted', async () => {
    let payload: unknown;
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/book_inspection'), async ({ request }) => {
        payload = await request.json();
        return HttpResponse.json({ id: 'd1', number: 1099 });
      }),
    );
    const store = useBookingStore.getState();
    store.chooseHome({ kind: 'property', propertyId: PROPERTY.property_id, listingId: null }, null);
    store.saveHome(HOME);
    store.pickStart(tomorrowAt(9, 30));
    store.saveAccess({ mode: 'self', name: null, phone: null, tags: ['intercom'], notes: null });
    const { user } = await renderAppRoute('/inspection?step=5', { auth: signedInAs('user') });

    const submit = await screen.findByRole('button', {
      name: new RegExp(ro.booking.payment.submit),
    });
    await user.click(submit);
    expect(payload).toBeUndefined();
    await user.click(screen.getByRole('checkbox', { name: ro.booking.payment.terms }));
    await user.click(submit);

    await waitFor(() => {
      expect(payload).toMatchObject({
        p_property_id: PROPERTY.property_id,
        p_city_id: TIMISOARA_ID,
        p_starts_at: tomorrowAt(9, 30),
        p_access_mode: 'self',
        p_access_tags: ['intercom'],
        p_payment_method: 'card',
      });
    });
  });

  it('sends the visitor back to the date step when the hour was just taken', async () => {
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/book_inspection'), () =>
        HttpResponse.json({ code: 'P0001', message: 'slot_taken', details: null }, { status: 400 }),
      ),
      slotsResponse([{ starts_at: tomorrowAt(11, 0), working: 1, free: 1 }]),
    );
    const store = useBookingStore.getState();
    store.chooseHome({ kind: 'new' }, null);
    store.saveHome(HOME);
    store.pickStart(tomorrowAt(9, 30));
    store.saveAccess({ mode: 'self', name: null, phone: null, tags: [], notes: null });
    const { user } = await renderAppRoute('/inspection?step=5', { auth: signedInAs('user') });

    await user.click(await screen.findByRole('checkbox', { name: ro.booking.payment.terms }));
    await user.click(screen.getByRole('button', { name: new RegExp(ro.booking.payment.submit) }));

    expect(await screen.findByText(ro.booking.date.taken.title)).toBeInTheDocument();
    expect(useBookingStore.getState().startsAt).toBeNull();
  });
});
