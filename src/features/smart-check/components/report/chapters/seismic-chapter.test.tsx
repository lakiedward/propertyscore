import { screen, within } from '@testing-library/react';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs } from '@/test/factories/auth';
import { SEEDED_REPORT } from '@/test/msw/handlers/smart-check';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

describe('SeismicChapter', { timeout: 20_000 }, () => {
  it('shows the strongest earthquakes, the conclusion and the nine-city scale', async () => {
    await renderAppRoute(`/check/result/${SEEDED_REPORT.id}?chapter=seismic`, {
      auth: signedInAs(),
    });

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: ro.report.chapters.seismic.headline.nearModerate,
      }),
    ).toBeInTheDocument();
    const list = screen.getByRole('list', { name: ro.report.chapters.seismic.list.label });
    expect(within(list).getAllByRole('listitem')).toHaveLength(6);
    expect(
      screen.getByText(ro.report.chapters.seismic.conclusion.moderate.title),
    ).toBeInTheDocument();
    expect(screen.getByText(/Anul declarat al construcției: 1978/)).toBeInTheDocument();
    expect(screen.getByText(/P100-78, P100-81 și P100-90/)).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: ro.report.chapters.seismic.scale.track }),
    ).toBeInTheDocument();
  });
});
