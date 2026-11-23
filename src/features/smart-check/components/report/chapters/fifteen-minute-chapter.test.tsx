import { screen } from '@testing-library/react';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs } from '@/test/factories/auth';
import { SEEDED_REPORT } from '@/test/msw/handlers/smart-check';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

describe('FifteenMinuteChapter', { timeout: 20_000 }, () => {
  it('shows the checklist, the comparison with a typical neighbourhood and the score', async () => {
    const { user } = await renderAppRoute(
      `/check/result/${SEEDED_REPORT.id}?chapter=fifteenMinute`,
      { auth: signedInAs() },
    );

    const checklistTitle = await screen.findByRole('heading', {
      level: 3,
      name: /12 din 30 la 15 minute pe jos/,
    });
    expect(checklistTitle).toBeInTheDocument();
    const supermarket = screen.getByRole('button', { name: /Supermarket/ });
    expect(supermarket).toHaveAttribute('aria-pressed', 'false');
    await user.click(supermarket);
    expect(supermarket).toHaveAttribute('aria-pressed', 'true');

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: ro.report.chapters.fifteenMinute.tiles.title,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('cartier obișnuit: 6')).toBeInTheDocument();
    expect(screen.getByText(/Tu · 42/)).toBeInTheDocument();
  });
});
