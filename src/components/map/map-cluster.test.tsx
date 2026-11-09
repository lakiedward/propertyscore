import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { MapCluster } from './map-cluster';

describe('MapCluster', () => {
  it('shows the count and expands the group when pressed', async () => {
    const onExpand = vi.fn();
    const { user } = await renderWithProviders(
      <MapCluster label="12" accessibleName="12 locuințe, mărește harta" onExpand={onExpand} />,
    );

    const bubble = screen.getByRole('button', { name: '12 locuințe, mărește harta' });
    expect(bubble).toHaveTextContent('12');

    await user.click(bubble);

    expect(onExpand).toHaveBeenCalledOnce();
  });
});
