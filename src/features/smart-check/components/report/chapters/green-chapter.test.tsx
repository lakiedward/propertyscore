import { screen } from '@testing-library/react';
import en from '@/i18n/locales/en/smartCheck.json';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs } from '@/test/factories/auth';
import { FREIDORF_REPORT_RESULT, buildReportRow } from '@/test/factories/smart-check-report';
import { SEEDED_REPORT } from '@/test/msw/handlers/smart-check';
import { renderAppRoute, renderWithProviders } from '@/test/render';
import { parseReportResult } from '../../../report.utils';
import { GreenChapter } from './green-chapter';

const walkCases = [
  { scenario: 'longer estimate', routedMinutes: 4, secondMinutes: 10, estimated: true },
  { scenario: 'shorter estimate', routedMinutes: 10, secondMinutes: 8, estimated: true },
  { scenario: 'all routed', routedMinutes: 4, secondMinutes: 10, estimated: false },
];

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

  it.each(
    (
      [
        {
          locale: 'ro',
          labels: ro.report.chapters.green.parks,
          exactHeadline: ro.report.chapters.green.headline_few,
          estimatedHeadline: ro.report.chapters.green.headlineApprox_few,
        },
        {
          locale: 'en',
          labels: en.report.chapters.green.parks,
          exactHeadline: en.report.chapters.green.headline_other,
          estimatedHeadline: en.report.chapters.green.headlineApprox_other,
        },
      ] as const
    ).flatMap((language) => walkCases.map((walkCase) => ({ ...language, ...walkCase }))),
  )(
    'labels the Green walk and headline for $scenario in $locale',
    async ({
      locale,
      labels,
      exactHeadline,
      estimatedHeadline,
      routedMinutes,
      secondMinutes,
      estimated,
    }) => {
      const result = parseReportResult(SEEDED_REPORT.result);
      const section = result?.sections.green;
      const park = section?.parks[0];
      if (!result || !section || !park) throw new Error('fixture has no green park');
      const routed = {
        ...park,
        name: 'Routed park',
        area_ha: 2,
        walk_m: 1200,
        walk_seconds: routedMinutes * 60,
      };
      const second = {
        ...park,
        id: 'second',
        name: 'Second park',
        area_ha: 2,
        walk_m: secondMinutes * 80,
        walk_seconds: estimated ? undefined : secondMinutes * 60,
      };
      result.sections.green = {
        ...section,
        distance_method: 'pedestrian_routing',
        parks: [routed, second],
      };

      await renderWithProviders(
        <GreenChapter
          report={{ ...SEEDED_REPORT, status: 'ready', result }}
          onOpenChapter={vi.fn()}
        />,
        { locale },
      );

      const routedCard = await screen.findByRole('button', { name: /Routed park/ });
      const secondCard = screen.getByRole('button', { name: /Second park/ });
      expect(routedCard).toHaveTextContent(
        labels.walk.replace('{{minutes}}', String(routedMinutes)),
      );
      expect(routedCard).not.toHaveTextContent(
        labels.walkApprox.replace('{{minutes}}', String(routedMinutes)),
      );
      expect(secondCard).toHaveTextContent(
        (estimated ? labels.walkApprox : labels.walk).replace('{{minutes}}', String(secondMinutes)),
      );
      const headline = estimated ? estimatedHeadline : exactHeadline;
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        headline.replace('{{count}}', '2').replace('{{minutes}}', '10'),
      );
    },
  );
});
