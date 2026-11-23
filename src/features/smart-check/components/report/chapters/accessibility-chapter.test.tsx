import { screen, within } from '@testing-library/react';
import en from '@/i18n/locales/en/smartCheck.json';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { FREIDORF_REPORT_RESULT, buildReportRow } from '@/test/factories/smart-check-report';
import { renderWithProviders } from '@/test/render';
import type { ReadyReport } from '../../../report.types';
import { parseReportResult } from '../../../report.utils';
import { AccessibilityChapter } from './accessibility-chapter';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

function readyReport(): ReadyReport {
  const row = buildReportRow();
  const result = parseReportResult(FREIDORF_REPORT_RESULT);
  if (!result) throw new Error('The Freidorf fixture no longer parses');
  return { ...row, status: 'ready', result };
}

describe('AccessibilityChapter', () => {
  it('opens with the stops and lines count in the title and the zone score', async () => {
    await renderWithProviders(
      <AccessibilityChapter report={readyReport()} onOpenChapter={vi.fn()} />,
    );

    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent(
      /4 stații la 5 minute pe jos și 3 linii/,
    );
    expect(screen.getByText(/Accesibilitate · 28 \/ 100 · Scăzut/)).toBeInTheDocument();
    expect(screen.getByText(/Mai bine decât/)).toHaveTextContent('63%');
  });

  it('lists every destination with its minutes and marks the chosen one', async () => {
    const { user } = await renderWithProviders(
      <AccessibilityChapter report={readyReport()} onOpenChapter={vi.fn()} />,
    );

    const station = await screen.findByRole('button', { name: /Gara Timișoara Nord, 39 minute/ });
    expect(station).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByRole('button', { name: /minute$/ })).toHaveLength(8);

    await user.click(station);
    expect(station).toHaveAttribute('aria-pressed', 'true');

    await user.click(station);
    expect(station).toHaveAttribute('aria-pressed', 'false');
  });

  it('changes the share of the city reached when another time is picked', async () => {
    const { user } = await renderWithProviders(
      <AccessibilityChapter report={readyReport()} onOpenChapter={vi.fn()} />,
    );

    const group = await screen.findByRole('radiogroup', {
      name: ro.report.chapters.accessibility.reach.timeLabel,
    });
    expect(within(group).getByRole('radio', { name: '30 min' })).toBeChecked();
    expect(screen.getByText('6%')).toBeInTheDocument();

    await user.click(within(group).getByRole('radio', { name: '45 min' }));
    expect(screen.getByText('14%')).toBeInTheDocument();
  });

  it('is available in English', async () => {
    await renderWithProviders(
      <AccessibilityChapter report={readyReport()} onOpenChapter={vi.fn()} />,
      { locale: 'en' },
    );

    expect(await screen.findByText(en.report.chapters.accessibility.badge)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Timișoara North Station, 39 minutes/ }),
    ).toBeInTheDocument();
  });
});
