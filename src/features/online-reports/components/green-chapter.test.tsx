import { screen, within } from '@testing-library/react';
import { http } from 'msw';
import roOnlineReports from '@/i18n/locales/ro/onlineReports.json';
import {
  buildGreenSection,
  buildOnlineReport,
  buildReportResult,
} from '@/test/factories/online-report';
import { onlineReportResponse } from '@/test/msw/handlers/online-reports';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { OnlineReportPage } from './online-report-page';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const text = roOnlineReports.green;

function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replaceAll(`{{${name}}}`, String(value)),
    template,
  );
}

async function renderGreenChapter(
  green:
    ReturnType<typeof buildGreenSection> | Record<string, string | number> = buildGreenSection(),
) {
  const report = buildOnlineReport({
    result: { ...buildReportResult({ green: { score: 68, percentile: 78, city_avg: 48 } }), green },
  });
  server.use(http.get(supabaseUrl('/rest/v1/online_reports'), () => onlineReportResponse(report)));
  return renderWithProviders(
    <OnlineReportPage reportId={report.id} chapter="green" onChapterChange={vi.fn()} />,
  );
}

describe('GreenChapter', () => {
  it('compares the green share with the city and follows the chosen radius', async () => {
    const { user } = await renderGreenChapter();

    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: /verde în 500 m, peste media orașului/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: fill(text.share.waffleLabel_few, { count: 18, radius: '500 m' }),
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '1 km' }));

    expect(
      screen.getByRole('img', {
        name: fill(text.share.waffleLabel_other, { count: 24, radius: '1 km' }),
      }),
    ).toBeInTheDocument();
  });

  it('lists the nearest parks, filters them and marks the chosen one', async () => {
    const { user } = await renderGreenChapter();

    const list = await screen.findByRole('list', { name: text.parks.title });
    const parks = within(list).getAllByRole('button');
    expect(parks).toHaveLength(3);
    expect(parks[0]).toHaveTextContent(text.parks.unnamed);
    expect(parks[0]).toHaveTextContent(text.parks.nearestSmall);
    expect(parks[1]).toHaveTextContent(text.parks.amenity.playground);

    await user.click(screen.getByRole('button', { name: /Pentru câini/ }));
    expect(within(list).getAllByRole('button')).toHaveLength(1);
    expect(within(list).getByRole('button')).toHaveTextContent('Parcul Rozelor');

    await user.click(within(list).getByRole('button'));
    expect(within(list).getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(list).getByRole('button'));
    expect(within(list).getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows where the points come from and what would raise the score', async () => {
    await renderGreenChapter();

    expect(
      await screen.findByText(fill(text.breakdown.points_other, { earned: 24, count: 39 })),
    ).toBeInTheDocument();
    expect(screen.getByText(text.breakdown.excluded)).toBeInTheDocument();
    expect(
      screen.getByText(fill(text.breakdown.gain.share_few, { count: 15, radius: '500 m' })),
    ).toBeInTheDocument();
  });

  it('shows only the shared score details when the address has no green data', async () => {
    await renderGreenChapter({ schema_version: 1, status: 'no_data', reason: 'no_source_data' });

    expect(await screen.findByRole('heading', { level: 2, name: /Timișoara/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: text.parks.title })).not.toBeInTheDocument();
  });
});
