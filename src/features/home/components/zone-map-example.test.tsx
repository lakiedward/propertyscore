import { screen, within } from '@testing-library/react';
import roHome from '@/i18n/locales/ro/home.json';
import { renderWithProviders } from '@/test/render';
import { SAMPLE_REPORT } from '../data/sample-report';
import { ZoneMapExample } from './zone-map-example';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const map = roHome.smartCheck.map;
const pharmacy = map.places.pharmacy.replace('{{name}}', 'Medimfarm');

describe('ZoneMapExample', () => {
  it('lists the walking routes first, then the safety legend', async () => {
    const { user } = await renderWithProviders(<ZoneMapExample />);

    expect(await screen.findByRole('region', { name: map.mapLabel })).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getByText(new RegExp(pharmacy))).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: map.layers.safety }));

    expect(
      screen.getByText(map.safetyScore.replace('{{score}}', String(SAMPLE_REPORT.scores.safety))),
    ).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(pharmacy))).not.toBeInTheDocument();
  });
});
