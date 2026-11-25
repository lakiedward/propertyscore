import { screen } from '@testing-library/react';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs } from '@/test/factories/auth';
import { FREIDORF_REPORT_RESULT, buildReportRow } from '@/test/factories/smart-check-report';
import { SEEDED_REPORT } from '@/test/msw/handlers/smart-check';
import { renderAppRoute, renderWithProviders } from '@/test/render';
import { parseReportResult } from '../../../report.utils';
import { GreenChapter } from './green-chapter';

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

  it('keeps the no-parks conclusion when green data is available but no park was found', async () => {
    const result = parseReportResult(FREIDORF_REPORT_RESULT);
    if (!result?.sections.green) throw new Error('The Freidorf fixture has no green section');
    result.sections.green.parks = [];

    await renderWithProviders(
      <GreenChapter
        report={{ ...buildReportRow(), status: 'ready', result }}
        onOpenChapter={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole('heading', { name: ro.report.chapters.green.headlineNone }),
    ).toBeVisible();
    expect(screen.queryByText(ro.report.chapters.green.noData)).not.toBeInTheDocument();
  });
});
