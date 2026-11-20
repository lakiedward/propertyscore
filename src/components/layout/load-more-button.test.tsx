import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { LoadMoreButton } from './load-more-button';

describe('LoadMoreButton', () => {
  it('asks for the next page', async () => {
    const onLoadMore = vi.fn();
    const { user } = await renderWithProviders(
      <LoadMoreButton label="Arată mai multe" isLoading={false} onLoadMore={onLoadMore} />,
    );

    await user.click(screen.getByRole('button', { name: 'Arată mai multe' }));

    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('is busy and cannot be pressed while the page loads', async () => {
    const onLoadMore = vi.fn();
    await renderWithProviders(
      <LoadMoreButton label="Arată mai multe" isLoading onLoadMore={onLoadMore} />,
    );

    const button = screen.getByRole('button', { name: 'Arată mai multe' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
