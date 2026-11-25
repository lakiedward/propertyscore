import { screen, within } from '@testing-library/react';
import en from '@/i18n/locales/en/smartCheck.json';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { FREIDORF_REPORT_RESULT, buildReportRow } from '@/test/factories/smart-check-report';
import { renderWithProviders } from '@/test/render';
import type { ReadyReport } from '../../../report.types';
import { parseReportResult } from '../../../report.utils';
import { AccessibilityChapter } from './accessibility-chapter';
import { ClosingMethod } from './closing/closing-method';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const copy = ro.report.chapters.accessibility;
const scoreEyebrow = copy.eyebrow
  .replace('{{score}}', '28')
  .replace('{{band}}', ro.report.bands.low);

function readyReport(raw = FREIDORF_REPORT_RESULT): ReadyReport {
  const row = buildReportRow();
  const result = parseReportResult(raw);
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
    expect(screen.getByText(scoreEyebrow)).toBeInTheDocument();
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

  it.each([
    { quality: 'gtfs', date: 'not-a-date', displayedDate: null },
    { quality: 'gtfs', date: '2026-02-30', displayedDate: null },
    { quality: 'gtfs', date: '2026-11-03', displayedDate: '3 nov. 2026' },
    { quality: 'osm_only', date: '2026-11-03', displayedDate: null },
  ])(
    'cites only the timetable used ($quality, $date)',
    async ({ quality, date, displayedDate }) => {
      const accessibility = FREIDORF_REPORT_RESULT.accessibility;
      if (!accessibility || typeof accessibility !== 'object') {
        throw new Error('The Freidorf fixture has no accessibility section');
      }
      const report = readyReport({
        ...FREIDORF_REPORT_RESULT,
        accessibility: { ...accessibility, data_quality: quality, reference_date: date },
        snapshot: { period: '2026-11-01', source_dates: { gtfs: '2026-11-25', osm: '2026-11-01' } },
      });
      await renderWithProviders(
        <>
          <AccessibilityChapter report={report} onOpenChapter={vi.fn()} />
          <ClosingMethod report={report} />
        </>,
      );

      const closingSource = ro.report.chapters.closing.method.sources.gtfs;
      const isGtfsSource = (text: string) => text.includes(`${copy.sources.gtfs} ·`);
      expect(screen.getByText(scoreEyebrow)).toBeInTheDocument();
      expect(
        screen.getByText((text) => text.includes(`${copy.sources.osm} ·`)),
      ).toBeInTheDocument();
      expect(screen.queryByText(/25 nov\.? 2026/)).not.toBeInTheDocument();
      if (displayedDate) {
        expect(
          screen.getByText(copy.sourceTimetable.replace('{{date}}', displayedDate)),
        ).toBeVisible();
        expect(
          screen.getByText((text) => text.includes(`${copy.sources.gtfs} · ${displayedDate}`)),
        ).toBeInTheDocument();
        expect(screen.getByText(closingSource)).toBeVisible();
        expect(screen.getByText(displayedDate.replace('.', ''))).toBeVisible();
      } else {
        expect(
          screen.getByText(quality === 'osm_only' ? copy.sourceOsm : copy.sourceTimetableUndated),
        ).toBeVisible();
        expect(screen.queryByText(isGtfsSource)).not.toBeInTheDocument();
        expect(screen.queryByText(closingSource)).not.toBeInTheDocument();
      }
    },
  );
});
