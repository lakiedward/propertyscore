import { screen } from '@testing-library/react';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs } from '@/test/factories/auth';
import { SEEDED_REPORT } from '@/test/msw/handlers/smart-check';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

describe('ClosingChapter', { timeout: 20_000 }, () => {
  it('shows the next step and the method without viewing questions', async () => {
    await renderAppRoute(`/check/result/${SEEDED_REPORT.id}?chapter=safety`, {
      auth: signedInAs(),
    });

    expect(
      await screen.findByRole('heading', { level: 2, name: ro.report.chapters.closing.next.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: ro.report.chapters.closing.method.title }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/întrebări pentru proprietar/)).not.toBeInTheDocument();
    expect(screen.queryByText(/din 2 bifate/)).not.toBeInTheDocument();
    expect(screen.queryByText('Verifică altă adresă')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Programează inspecția/ })).not.toHaveLength(0);
  });
});
