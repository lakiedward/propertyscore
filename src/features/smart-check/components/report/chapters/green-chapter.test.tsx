import { screen } from '@testing-library/react';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs } from '@/test/factories/auth';
import { SEEDED_REPORT } from '@/test/msw/handlers/smart-check';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

describe('GreenChapter', { timeout: 20_000 }, () => {
  it('lists the large parks and highlights the one that is pressed', async () => {
    const { user } = await renderAppRoute(`/check/result/${SEEDED_REPORT.id}?chapter=green`, {
      auth: signedInAs(),
    });

    expect(await screen.findByRole('heading', { level: 2, name: /2 parcuri mari/ })).toBeVisible();
    const parks = screen.getAllByRole('button', {
      name: new RegExp(ro.report.chapters.green.parks.unnamed),
    });
    const [first, second] = parks;
    if (!first || !second) throw new Error('expected two parks');
    expect(first).toHaveAttribute('aria-pressed', 'false');

    await user.click(first);

    expect(first).toHaveAttribute('aria-pressed', 'true');
    expect(second).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows the score card and the sources', async () => {
    await renderAppRoute(`/check/result/${SEEDED_REPORT.id}?chapter=green`, {
      auth: signedInAs(),
    });

    expect(
      (await screen.findAllByText(ro.report.chapters.green.sources.title)).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Tu · 32/)).toBeInTheDocument();
  });
});
