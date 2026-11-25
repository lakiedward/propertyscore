import { screen, within } from '@testing-library/react';
import en from '@/i18n/locales/en/smartCheck.json';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { buildSavedWalkReport } from '@/test/factories/smart-check-report';
import { renderWithProviders } from '@/test/render';
import { parseReportResult } from '../../../report.utils';
import { SummaryMapBand } from './summary-map-band';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const summaries = { ro: ro.report.chapters.summary, en: en.report.chapters.summary };

describe('SummaryMapBand', () => {
  it.each([
    { locale: 'ro', hasRoutes: false },
    { locale: 'en', hasRoutes: false },
    { locale: 'ro', hasRoutes: true },
    { locale: 'en', hasRoutes: true },
  ] as const)(
    'describes the map in $locale with saved routes: $hasRoutes',
    async ({ locale, hasRoutes }) => {
      const report = buildSavedWalkReport(hasRoutes ? 'pedestrian_routing' : 'straight_line');
      const result = parseReportResult(report.result);
      if (!result) throw new Error('The walking report fixture no longer parses');
      const { user } = await renderWithProviders(
        <SummaryMapBand report={{ ...report, result, status: 'ready' }} />,
        { locale },
      );
      const copy = summaries[locale];
      const teaser = within(await screen.findByRole('region', { name: copy.mapBand.title }));

      expect(within(teaser.getByText(copy.mapBand.walk)).getByText('2')).toBeInTheDocument();
      expect(
        teaser.getByText(hasRoutes ? copy.mapBand.textWithRoutes : copy.mapBand.textWithoutRoutes),
      ).toBeInTheDocument();
      expect(
        teaser.queryByText(
          hasRoutes ? copy.mapBand.textWithoutRoutes : copy.mapBand.textWithRoutes,
        ),
      ).not.toBeInTheDocument();

      await user.click(teaser.getByRole('button', { name: copy.mapBand.open }));
      const explorer = within(await screen.findByRole('dialog'));

      if (hasRoutes) {
        expect(explorer.getByText(copy.explorer.walkNote.routed)).toBeInTheDocument();
        expect(explorer.getByRole('img', { name: 'zone-route-shop-1' })).toBeInTheDocument();
      } else {
        expect(explorer.getByText(copy.explorer.walkNote.estimated)).toBeInTheDocument();
        expect(explorer.queryByRole('img', { name: /^zone-route-/ })).not.toBeInTheDocument();
      }
    },
  );
});
