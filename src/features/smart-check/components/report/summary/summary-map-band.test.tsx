import { screen, within } from '@testing-library/react';
import en from '@/i18n/locales/en/smartCheck.json';
import ro from '@/i18n/locales/ro/smartCheck.json';
import {
  buildSavedWalkReport,
  ONE_POINT_WALK_POLYLINE,
  SAVED_WALK_POLYLINE,
  TRANSIT_MAP_POINTS,
} from '@/test/factories/smart-check-report';
import { renderWithProviders } from '@/test/render';
import { parseReportResult } from '../../../report.utils';
import { SummaryMapBand } from './summary-map-band';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const summaries = { ro: ro.report.chapters.summary, en: en.report.chapters.summary };

async function renderMapBand(
  report: ReturnType<typeof buildSavedWalkReport>,
  locale: keyof typeof summaries,
) {
  const result = parseReportResult(report.result);
  if (!result || result.unreadableSections.length > 0) {
    throw new Error('The map report fixture no longer parses');
  }
  const { user } = await renderWithProviders(
    <SummaryMapBand report={{ ...report, result, status: 'ready' }} />,
    { locale },
  );
  const copy = summaries[locale];
  const teaser = within(await screen.findByRole('region', { name: copy.mapBand.title }));
  return { user, copy, teaser };
}

describe('SummaryMapBand', () => {
  describe.each(['ro', 'en'] as const)('%s', (locale) => {
    it.each([
      { scenario: 'no saved route', polylines: undefined, note: 'estimated', route: null },
      { scenario: 'zero points', polylines: [''], note: 'unavailable', route: null },
      {
        scenario: 'one point',
        polylines: [ONE_POINT_WALK_POLYLINE],
        note: 'unavailable',
        route: null,
      },
      {
        scenario: 'a valid line',
        polylines: [SAVED_WALK_POLYLINE],
        note: 'routed',
        route: 'zone-route-shop-1',
      },
      {
        scenario: 'a nearer invalid route and a farther valid route in the same group',
        polylines: [ONE_POINT_WALK_POLYLINE, SAVED_WALK_POLYLINE],
        note: 'routed',
        route: 'zone-route-shop-2',
      },
    ] as const)('describes walking geometry with $scenario', async ({ polylines, note, route }) => {
      const report = buildSavedWalkReport(
        polylines === undefined ? 'straight_line' : 'pedestrian_routing',
        { walkingPolylines: polylines },
      );
      const { user, copy, teaser } = await renderMapBand(report, locale);
      const hasRoute = route !== null;

      expect(
        within(teaser.getByText(copy.mapBand.walk)).getByText(polylines?.length === 2 ? '3' : '2'),
      ).toBeInTheDocument();
      expect(
        teaser.getByText(hasRoute ? copy.mapBand.textWithRoutes : copy.mapBand.textWithoutRoutes),
      ).toBeInTheDocument();
      expect(
        teaser.queryByText(hasRoute ? copy.mapBand.textWithoutRoutes : copy.mapBand.textWithRoutes),
      ).not.toBeInTheDocument();

      await user.click(teaser.getByRole('button', { name: copy.mapBand.open }));
      const explorer = within(await screen.findByRole('dialog'));
      expect(explorer.getByText(copy.explorer.walkNote[note])).toBeInTheDocument();

      expect(explorer.queryAllByRole('img', { name: /^zone-route-/ })).toHaveLength(
        hasRoute ? 1 : 0,
      );
      if (route) {
        expect(explorer.getByRole('img', { name: route })).toBeInTheDocument();
      }
    });

    it('keeps route details outside the map before and after selection', async () => {
      const report = buildSavedWalkReport('pedestrian_routing', {
        walkingPolylines: [ONE_POINT_WALK_POLYLINE, SAVED_WALK_POLYLINE],
      });
      const { user, copy, teaser } = await renderMapBand(report, locale);
      const name = copy.explorer.placeKinds.shops;
      const duration = copy.explorer.minutes.replace('{{minutes}}', '8');
      const routeLabel = copy.explorer.routeLabel
        .replace('{{name}}', name)
        .replace('{{minutes}}', '8');

      await user.click(teaser.getByRole('button', { name: copy.mapBand.open }));
      const explorer = within(await screen.findByRole('dialog'));
      const map = within(await explorer.findByRole('region', { name: copy.explorer.mapLabel }));
      const unselectedRoute = explorer.getByRole('button', { name: routeLabel, pressed: false });
      expect(map.queryByText(report.address_text)).not.toBeInTheDocument();
      expect(map.queryByText(duration)).not.toBeInTheDocument();
      expect(explorer.getByText(report.address_text)).toBeVisible();
      expect(within(unselectedRoute).getByText(name)).toBeVisible();
      expect(within(unselectedRoute).getByText(duration)).toBeVisible();
      expect(map.getByRole('img', { name: 'zone-route-shop-2' })).toBeInTheDocument();

      await user.click(unselectedRoute);

      expect(map.queryByText(report.address_text)).not.toBeInTheDocument();
      expect(map.queryByText(duration)).not.toBeInTheDocument();
      expect(explorer.getByText(report.address_text)).toBeVisible();
      const selectedRoute = explorer.getByRole('button', { name: routeLabel, pressed: true });
      expect(within(selectedRoute).getByText(name)).toBeVisible();
      expect(within(selectedRoute).getByText(duration)).toBeVisible();
      expect(map.getByRole('img', { name: 'zone-route-shop-2' })).toBeInTheDocument();

      await user.click(selectedRoute);
      expect(map.queryByText(report.address_text)).not.toBeInTheDocument();
      expect(map.queryByText(duration)).not.toBeInTheDocument();
    });

    it.each([
      { scenario: 'zero points', lines: [[]], hasRoute: false },
      {
        scenario: 'separate single-point legs',
        lines: TRANSIT_MAP_POINTS.map((point) => [point]),
        hasRoute: false,
      },
      {
        scenario: 'a valid leg followed by an empty leg',
        lines: [TRANSIT_MAP_POINTS, []],
        hasRoute: true,
      },
    ])('describes transit geometry with $scenario', async ({ lines, hasRoute }) => {
      const report = buildSavedWalkReport('straight_line', { transitLines: lines });
      const { user, copy, teaser } = await renderMapBand(report, locale);

      expect(
        teaser.getByText(hasRoute ? copy.mapBand.textWithRoutes : copy.mapBand.textWithoutRoutes),
      ).toBeInTheDocument();

      await user.click(teaser.getByRole('button', { name: copy.mapBand.open }));
      const explorer = within(await screen.findByRole('dialog'));
      await user.click(explorer.getByRole('radio', { name: copy.explorer.transit }));
      if (hasRoute) {
        expect(explorer.getByRole('img', { name: 'zone-route-station-1' })).toBeInTheDocument();
      } else {
        expect(explorer.getByText(copy.explorer.empty)).toBeInTheDocument();
        expect(explorer.queryByRole('img', { name: /^zone-route-/ })).not.toBeInTheDocument();
      }
    });
  });
});
