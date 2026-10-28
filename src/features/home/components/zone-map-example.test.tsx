import { screen } from '@testing-library/react';
import roHome from '@/i18n/locales/ro/home.json';
import { renderWithProviders } from '@/test/render';
import { ZoneMapExample } from './zone-map-example';

vi.mock('@/components/map/map-canvas', () => ({
  MapCanvas: ({ label }: { label: string }) => <div role="region" aria-label={label} />,
}));

const map = roHome.smartCheck.map;

describe('ZoneMapExample', () => {
  it('lists the walking routes first, then the safety legend', async () => {
    const { user } = await renderWithProviders(<ZoneMapExample />);

    expect(await screen.findByRole('region', { name: map.mapLabel })).toBeInTheDocument();
    expect(screen.getByText(/Colegiul Național C\. D\. Loga, 7 min pe jos/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: map.layers.safety }));

    expect(screen.getByText(map.safetyScore.replace('{{score}}', '78'))).toBeInTheDocument();
    expect(screen.queryByText(/Colegiul Național/)).not.toBeInTheDocument();
  });

  it('labels the map as an example', async () => {
    await renderWithProviders(<ZoneMapExample />);

    expect(screen.getByText(map.exampleTag)).toBeInTheDocument();
  });
});
