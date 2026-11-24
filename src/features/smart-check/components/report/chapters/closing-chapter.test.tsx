import { screen } from '@testing-library/react';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs } from '@/test/factories/auth';
import { SEEDED_REPORT } from '@/test/msw/handlers/smart-check';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

describe('ClosingChapter', { timeout: 20_000 }, () => {
  it('lists the viewing questions, ticks them and opens the chapter of a topic', async () => {
    const { user } = await renderAppRoute(`/check/result/${SEEDED_REPORT.id}?chapter=safety`, {
      auth: signedInAs(),
    });

    expect(
      await screen.findByRole('heading', { level: 2, name: /2 întrebări pentru proprietar/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/din 2 bifate/)).toHaveTextContent('0 din 2 bifate');
    await user.click(screen.getByRole('checkbox', { name: /întrebarea 1/ }));
    expect(screen.getByText(/din 2 bifate/)).toHaveTextContent('1 din 2 bifate');

    expect(
      screen.getByRole('heading', { level: 2, name: ro.report.chapters.closing.next.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: ro.report.chapters.closing.method.title }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Vezi capitolul Zgomot/ }));
    expect(screen.getByRole('tab', { name: /Zgomot/ })).toHaveAttribute('aria-selected', 'true');
  });
});
