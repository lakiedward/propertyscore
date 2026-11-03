import { screen, within } from '@testing-library/react';
import { http } from 'msw';
import roOnlineReports from '@/i18n/locales/ro/onlineReports.json';
import {
  buildAccessibilitySection,
  buildAirSection,
  buildFifteenMinuteSection,
  buildIndustrySection,
  buildNoiseSection,
  buildOnlineReport,
  buildReportResult,
  buildSafetySection,
} from '@/test/factories/online-report';
import { onlineReportResponse } from '@/test/msw/handlers/online-reports';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import type { ChapterId } from '../online-report.utils';
import { OnlineReportPage } from './online-report-page';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const text = roOnlineReports;

async function renderChapter(chapter: ChapterId, sections: Record<string, unknown>) {
  const report = buildOnlineReport({
    result: { ...buildReportResult(), ...sections },
  });
  server.use(http.get(supabaseUrl('/rest/v1/online_reports'), () => onlineReportResponse(report)));
  return await renderWithProviders(
    <OnlineReportPage reportId={report.id} chapter={chapter} onChapterChange={vi.fn()} />,
  );
}

describe('ChapterDetails', () => {
  it('shows the noise level, the nearest sources and switches to night', async () => {
    const { user } = await renderChapter('noise', { noise: buildNoiseSection() });

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Cam 61 dB la adresă' }),
    ).toBeInTheDocument();
    const sources = screen.getByRole('list', { name: text.noise.sources.title });
    expect(within(sources).getAllByRole('listitem')).toHaveLength(2);
    expect(sources).toHaveTextContent('Bulevardul Revoluției');

    await user.click(screen.getByRole('radio', { name: text.moment.night }));
    expect(
      screen.getByRole('heading', { level: 3, name: 'Cam 52 dB la adresă' }),
    ).toBeInTheDocument();
  });

  it('explains when the city has no noise data', async () => {
    await renderChapter('noise', {
      noise: { ...buildNoiseSection(), status: 'no_data', score: null, lden: null, lnight: null },
    });

    expect(await screen.findByText(text.noise.noData)).toBeInTheDocument();
  });

  it('charts the air month by month with the verdict and the city average', async () => {
    await renderChapter('air', { air: buildAirSection() });

    expect(
      await screen.findByRole('heading', { level: 3, name: text.air.verdict.winter_peaks }),
    ).toBeInTheDocument();
    const chart = screen.getByRole('list', { name: text.air.months.chartLabel });
    expect(within(chart).getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText(text.air.compare.city)).toBeInTheDocument();
  });

  it('lists the industrial sites and selects one', async () => {
    const { user } = await renderChapter('industry', { industry: buildIndustrySection() });

    const list = await screen.findByRole('list', { name: /Un amplasament industrial la/ });
    const sites = within(list).getAllByRole('button');
    expect(sites).toHaveLength(2);
    const nearest = within(list).getByRole('button', { name: /Fabrica de bere/ });
    expect(nearest).toHaveTextContent(text.industry.impact.odour);

    await user.click(nearest);
    expect(nearest).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the daily services within 15 minutes and the missing ones', async () => {
    await renderChapter('fifteen_minute', { fifteen_minute: buildFifteenMinuteSection() });

    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: '2 din 3 servicii zilnice la 15 minute pe jos',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(text.fifteenMinute.notInReach)).toBeInTheDocument();
    const nearest = screen.getByRole('list', { name: text.fifteenMinute.nearest.title });
    expect(within(nearest).getAllByRole('button')[0]).toHaveTextContent('Profi');
  });

  it('breaks the safety score down for the chosen moment', async () => {
    const { user } = await renderChapter('safety', { safety: buildSafetySection() });

    expect(
      await screen.findByRole('heading', { level: 3, name: 'De ce are adresa 62' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(text.safety.row.police)).toHaveLength(2);
    expect(screen.getByText('−2')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Noaptea · 60' }));
    expect(
      screen.getByRole('heading', { level: 3, name: 'De ce are adresa 60' }),
    ).toBeInTheDocument();
  });

  it('shows the trip to the key places, the stops and the lines', async () => {
    await renderChapter('accessibility', { accessibility: buildAccessibilitySection() });

    const destinations = await screen.findByRole('list', {
      name: text.accessibility.destinations.title,
    });
    expect(within(destinations).getByRole('button')).toHaveTextContent('Piața Victoriei');
    expect(within(destinations).getByRole('button')).toHaveTextContent('Tramvai 1');
    expect(screen.getByText('Piața Mărăști')).toBeInTheDocument();
    expect(screen.getByText('de 8 ori pe oră la vârf')).toBeInTheDocument();
  });

  it('shows Seismic and Investment as context on the summary', async () => {
    await renderChapter('summary', {});

    expect(
      await screen.findByRole('heading', { level: 3, name: text.context.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(text.context.seismic.title)).toBeInTheDocument();
    expect(screen.getByText(text.context.investment.title)).toBeInTheDocument();
  });
});
