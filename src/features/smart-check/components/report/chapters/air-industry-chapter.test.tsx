import { screen } from '@testing-library/react';
import en from '@/i18n/locales/en/smartCheck.json';
import { FREIDORF_REPORT_RESULT, buildReportRow } from '@/test/factories/smart-check-report';
import { renderWithProviders } from '@/test/render';
import type { ReadyReport } from '../../../report.types';
import { parseReportResult } from '../../../report.utils';
import { AirIndustryChapter } from './air-industry-chapter';

function readyReport(): ReadyReport {
  const row = buildReportRow();
  const result = parseReportResult(FREIDORF_REPORT_RESULT);
  if (!result) throw new Error('The Freidorf fixture no longer parses');
  return { ...row, status: 'ready', result };
}

describe('AirIndustryChapter', () => {
  it('opens with both scores and the air and factory verdict in the title', async () => {
    await renderWithProviders(
      <AirIndustryChapter report={readyReport()} onOpenChapter={vi.fn()} />,
    );

    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent(
      /Aer peste limita UE în cea mai mare parte a anului, fabrici la peste/,
    );
    expect(screen.getByText('Aer · 72 / 100')).toBeInTheDocument();
    expect(screen.getByText('Industrie · 78 / 100')).toBeInTheDocument();
  });

  it('shows the month chart against the limit and the nearest sites with distances', async () => {
    await renderWithProviders(
      <AirIndustryChapter report={readyReport()} onOpenChapter={vi.fn()} />,
    );

    expect(await screen.findByText('8 luni din 12 peste limita UE din 2030')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Praful fin din aer/ })).toBeInTheDocument();
    expect(screen.getByText('SC LIPOPLAST SRL')).toBeInTheDocument();
    expect(screen.getByText('SC COLTERM SA - CET SUD')).toBeInTheDocument();
    expect(screen.getByText(/emisii în aer · mai ales iarna/)).toBeInTheDocument();
  });

  it('gives each score its own card and lists the weight of both in the sources', async () => {
    await renderWithProviders(
      <AirIndustryChapter report={readyReport()} onOpenChapter={vi.fn()} />,
    );

    expect(await screen.findAllByText(/^Ține cont de$/)).toHaveLength(2);
    expect(screen.getAllByText(/Media orașului:/)).toHaveLength(2);
    expect(screen.getAllByText(/Pondere în scorul de zonă/)).toHaveLength(2);
  });

  it('is available in English', async () => {
    await renderWithProviders(
      <AirIndustryChapter report={readyReport()} onOpenChapter={vi.fn()} />,
      {
        locale: 'en',
      },
    );

    expect(await screen.findByText(en.report.chapters.airIndustry.badge)).toBeInTheDocument();
    expect(screen.getByText('8 months out of 12 above the 2030 EU limit')).toBeInTheDocument();
  });

  it('shows the available industry result and discloses missing air data', async () => {
    const report = readyReport();
    report.result.sections.air = null;
    delete report.result.categories.air;

    await renderWithProviders(<AirIndustryChapter report={report} onOpenChapter={vi.fn()} />, {
      locale: 'en',
    });

    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent(/factories/i);
    expect(
      screen.getByText(new RegExp(en.report.chapters.airIndustry.lead.noAirData)),
    ).toBeVisible();
    expect(screen.queryByText(en.report.chapters.airIndustry.badge)).not.toBeInTheDocument();
  });
});
