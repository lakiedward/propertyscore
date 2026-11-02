import { screen, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { formatPrice } from '@/i18n/format';
import roCommon from '@/i18n/locales/ro/common.json';
import roListings from '@/i18n/locales/ro/listings.json';
import { buildListing } from '@/test/factories/listing';
import { mapCanvasStubControl } from '@/test/mocks/map-canvas-control';
import { listingsResponse } from '@/test/msw/handlers/listings';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { getListingThumbUrl } from '../api/listings.storage';
import { ListingsBoard } from './listings-board';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const CITY = 'Timișoara';
const count = roListings.board.count;

function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replace(`{{${name}}}`, String(value)),
    template,
  );
}

function countTail(template: string) {
  return template.slice(template.indexOf('{{city}}') + '{{city}}'.length);
}

function serveListings(items: ReturnType<typeof buildListing>[], total = items.length) {
  server.use(http.get(supabaseUrl('/rest/v1/listings'), () => listingsResponse(items, total)));
}

async function findListingButtons() {
  const list = await screen.findByRole('list', { name: roListings.board.listLabel });
  return within(list).findAllByRole('button');
}

afterEach(() => {
  mapCanvasStubControl.shouldFail = false;
});

describe('ListingsBoard', () => {
  it('lists the published listings for sale with their count', async () => {
    await renderWithProviders(<ListingsBoard transaction="sale" onTransactionChange={vi.fn()} />);

    const buttons = await findListingButtons();
    expect(buttons).toHaveLength(2);
    expect(screen.getByText(fill(count.sale_few, { count: 2, city: CITY }))).toBeInTheDocument();
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the loading skeleton while the listings load', async () => {
    server.use(
      http.get(supabaseUrl('/rest/v1/listings'), async () => {
        await delay('infinite');
        return listingsResponse([]);
      }),
    );
    await renderWithProviders(<ListingsBoard transaction="sale" onTransactionChange={vi.fn()} />);

    expect(screen.getByRole('list', { name: roListings.board.listLabel })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('uses the Romanian singular for one listing', async () => {
    serveListings([buildListing({ transaction: 'rent', price: 450 })]);
    await renderWithProviders(<ListingsBoard transaction="rent" onTransactionChange={vi.fn()} />);

    expect(
      await screen.findByText(fill(count.rent_one, { count: 1, city: CITY })),
    ).toBeInTheDocument();
    expect(
      screen.getByText(fill(roCommon.price.perMonth, { price: formatPrice(450, 'EUR') })),
    ).toBeInTheDocument();
  });

  it('uses the Romanian plural with "de" for twenty listings', async () => {
    serveListings([buildListing(), buildListing(), buildListing(), buildListing()], 20);
    await renderWithProviders(<ListingsBoard transaction="sale" onTransactionChange={vi.fn()} />);

    expect(
      await screen.findByText(fill(count.sale_other, { count: 20, city: CITY })),
    ).toBeInTheDocument();
  });

  it('names the trust level of every card', async () => {
    await renderWithProviders(<ListingsBoard transaction="sale" onTransactionChange={vi.fn()} />);
    await findListingButtons();

    expect(
      screen.getByRole('button', { name: (name) => name.includes(roCommon.trust.physical) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: (name) => name.includes(fill(roCommon.trust.smartcheck, { score: 74 })),
      }),
    ).toBeInTheDocument();
  });

  it('says the score is unavailable when a Smart Check listing has none', async () => {
    serveListings([buildListing({ verification: 'smartcheck', smartcheck_score: null })]);
    await renderWithProviders(<ListingsBoard transaction="sale" onTransactionChange={vi.fn()} />);

    expect(
      await screen.findByRole('button', {
        name: (name) => name.includes(roCommon.trust.smartcheckNoScore),
      }),
    ).toBeInTheDocument();
  });

  it('shows the thumbnail of the cover photo', async () => {
    const photoPath = 'b0000000-0000-4000-8000-000000000999/cover.webp';
    serveListings([buildListing({ photo_path: photoPath })]);
    await renderWithProviders(<ListingsBoard transaction="sale" onTransactionChange={vi.fn()} />);

    const [card] = await findListingButtons();

    if (!card) {
      throw new Error('expected one listing');
    }
    expect(within(card).getByRole('presentation')).toHaveAttribute(
      'src',
      getListingThumbUrl(photoPath),
    );
  });

  it('asks for the other transaction when the toggle changes', async () => {
    const handleChange = vi.fn();
    const { user } = await renderWithProviders(
      <ListingsBoard transaction="sale" onTransactionChange={handleChange} />,
    );

    await user.click(screen.getByRole('radio', { name: roListings.transaction.rent }));

    expect(handleChange).toHaveBeenCalledWith('rent');
  });

  it('selects a listing when its card is chosen', async () => {
    const { user } = await renderWithProviders(
      <ListingsBoard transaction="sale" onTransactionChange={vi.fn()} />,
    );
    const [, second] = await findListingButtons();

    if (!second) {
      throw new Error('expected two listings');
    }
    await user.click(second);

    expect(second).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the list when the map fails to load', async () => {
    mapCanvasStubControl.shouldFail = true;
    await renderWithProviders(<ListingsBoard transaction="sale" onTransactionChange={vi.fn()} />);

    expect(await screen.findByText(roListings.board.mapError)).toBeInTheDocument();
    expect(await findListingButtons()).toHaveLength(2);
  });

  it('shows the empty state without a count when nothing is published', async () => {
    serveListings([]);
    await renderWithProviders(<ListingsBoard transaction="sale" onTransactionChange={vi.fn()} />);

    expect(await screen.findByText(roListings.board.empty.title)).toBeInTheDocument();
    expect(
      screen.queryByText((content) => content.includes(countTail(count.sale_other))),
    ).not.toBeInTheDocument();
  });

  it('shows the error state and retries', async () => {
    server.use(
      http.get(supabaseUrl('/rest/v1/listings'), () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );
    const { user } = await renderWithProviders(
      <ListingsBoard transaction="sale" onTransactionChange={vi.fn()} />,
    );

    expect(await screen.findByText(roListings.board.error.title)).toBeInTheDocument();
    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: roCommon.actions.retry }));

    expect(
      await screen.findByText(fill(count.sale_few, { count: 2, city: CITY })),
    ).toBeInTheDocument();
  });

  it('keeps the listings when a background refetch fails', async () => {
    const { queryClient } = await renderWithProviders(
      <ListingsBoard transaction="sale" onTransactionChange={vi.fn()} />,
    );
    await findListingButtons();
    server.use(
      http.get(supabaseUrl('/rest/v1/listings'), () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );

    await queryClient.refetchQueries();

    expect(screen.queryByText(roListings.board.error.title)).not.toBeInTheDocument();
    expect(screen.getByText(fill(count.sale_few, { count: 2, city: CITY }))).toBeInTheDocument();
    expect(await findListingButtons()).toHaveLength(2);
  });
});
