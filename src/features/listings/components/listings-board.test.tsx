import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roListings from '@/i18n/locales/ro/listings.json';
import roCommon from '@/i18n/locales/ro/common.json';
import { buildListing } from '@/test/factories/listing';
import { listingsResponse } from '@/test/msw/handlers/listings';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { ListingsBoard } from './listings-board';

vi.mock('@/components/map/map-canvas', () => ({
  MapCanvas: ({ label }: { label: string }) => <div role="region" aria-label={label} />,
}));

describe('ListingsBoard', () => {
  it('lists the published listings for sale with their count', async () => {
    await renderWithProviders(<ListingsBoard transaction="sale" onTransactionChange={vi.fn()} />);

    const list = await screen.findByRole('list', { name: roListings.board.listLabel });
    expect(await within(list).findAllByRole('button')).toHaveLength(2);
    expect(screen.getByText('2 anunțuri de vânzare · Timișoara')).toBeInTheDocument();
    expect(within(list).getAllByRole('button')[0]).toHaveAttribute('aria-pressed', 'true');
  });

  it('uses the Romanian singular for one listing', async () => {
    server.use(
      http.get(supabaseUrl('/rest/v1/listings'), () =>
        listingsResponse([buildListing({ transaction: 'rent', price: 450 })]),
      ),
    );
    await renderWithProviders(<ListingsBoard transaction="rent" onTransactionChange={vi.fn()} />);

    expect(await screen.findByText('1 anunț de închiriat · Timișoara')).toBeInTheDocument();
    expect(screen.getByText('450 € / lună')).toBeInTheDocument();
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
    const list = await screen.findByRole('list', { name: roListings.board.listLabel });
    const [, second] = await within(list).findAllByRole('button');

    if (!second) {
      throw new Error('expected two listings');
    }
    await user.click(second);

    expect(second).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the empty state when nothing is published', async () => {
    server.use(http.get(supabaseUrl('/rest/v1/listings'), () => listingsResponse([])));
    await renderWithProviders(<ListingsBoard transaction="sale" onTransactionChange={vi.fn()} />);

    expect(await screen.findByText(roListings.board.empty.title)).toBeInTheDocument();
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

    expect(await screen.findByText('2 anunțuri de vânzare · Timișoara')).toBeInTheDocument();
  });
});
