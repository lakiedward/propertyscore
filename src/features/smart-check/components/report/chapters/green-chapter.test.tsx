import { screen } from '@testing-library/react';
import en from '@/i18n/locales/en/smartCheck.json';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs } from '@/test/factories/auth';
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

  it.each([
    { locale: 'ro', labels: ro.report.chapters.green.parks },
    { locale: 'en', labels: en.report.chapters.green.parks },
  ] as const)(
    'labels only the estimated walk and its headline in $locale',
    async ({ locale, labels }) => {
      const result = parseReportResult(SEEDED_REPORT.result);
      const section = result?.sections.green;
      const park = section?.parks[0];
      if (!result || !section || !park) throw new Error('fixture has no green park');
      const routed = { ...park, name: 'Routed', area_ha: 2, walk_m: 1200, walk_seconds: 240 };
      const estimated = { ...park, id: 'estimated', name: 'Estimated', area_ha: 2, walk_m: 800 };
      result.sections.green = {
        ...section,
        distance_method: 'pedestrian_routing',
        parks: [routed, estimated],
      };

      await renderWithProviders(
        <GreenChapter
          report={{ ...SEEDED_REPORT, status: 'ready', result }}
          onOpenChapter={vi.fn()}
        />,
        { locale },
      );

      const estimatedText = labels.walkApprox.replace('{{minutes}}', '10');
      const routedCard = await screen.findByRole('button', { name: /Routed/ });
      expect(routedCard).toHaveTextContent(labels.walk.replace('{{minutes}}', '4'));
      expect(routedCard).not.toHaveTextContent(labels.walkApprox.replace('{{minutes}}', '4'));
      const estimatedCard = screen.getByRole('button', { name: /Estimated/ });
      expect(estimatedCard).toHaveTextContent(estimatedText);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(estimatedText);
    },
  );
});
