import { screen, within } from '@testing-library/react';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs } from '@/test/factories/auth';
import { SEEDED_REPORT } from '@/test/msw/handlers/smart-check';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

describe('NoiseChapter', { timeout: 20_000 }, () => {
  it('shows the day and night level and the loudest sources at the address', async () => {
    await renderAppRoute(`/check/result/${SEEDED_REPORT.id}?chapter=noise`, {
      auth: signedInAs(),
    });

    expect(await screen.findByRole('heading', { level: 2, name: /55–60 dB/ })).toBeVisible();
    expect(screen.getByText('45–50 dB')).toBeInTheDocument();
    const map = screen.getByRole('region', { name: ro.report.chapters.noise.map.label });
    expect(within(map).getByText('Strada Ardealului')).toBeInTheDocument();
    expect(within(map).getByText(ro.report.chapters.noise.names.tram)).toBeInTheDocument();
  });

  it('lists the four sound references and the colour legend', async () => {
    await renderAppRoute(`/check/result/${SEEDED_REPORT.id}?chapter=noise`, {
      auth: signedInAs(),
    });

    expect(await screen.findByText(ro.report.chapters.noise.references['40'])).toBeInTheDocument();
    expect(screen.getByText(ro.report.chapters.noise.references['70'])).toBeInTheDocument();
    expect(screen.getByText(ro.report.chapters.noise.map.estimate)).toBeInTheDocument();
  });
});
