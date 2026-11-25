import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import en from '@/i18n/locales/en/smartCheck.json';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { FREIDORF_REPORT_RESULT, buildReportRow } from '@/test/factories/smart-check-report';
import { renderWithProviders } from '@/test/render';
import type { ReadyReport } from '../../../report.types';
import { parseReportResult } from '../../../report.utils';
import { InvestmentChapter } from './investment-chapter';

function readyReport(
  patch: (investment: Record<string, unknown>) => void = () => undefined,
  withInvestment = true,
): ReadyReport {
  const raw = structuredClone(FREIDORF_REPORT_RESULT);
  const sections = raw as Record<string, Record<string, unknown> | undefined>;
  if (withInvestment && sections.investment) patch(sections.investment);
  if (!withInvestment) delete sections.investment;
  const result = parseReportResult(raw);
  if (!result) throw new Error('The Freidorf fixture no longer parses');
  return { ...buildReportRow(), status: 'ready', result };
}

function withArea(investment: Record<string, unknown>) {
  investment.declared = { ...(investment.declared as object), area_m2: 62 };
  investment.sale = {
    ...(investment.sale as object),
    estimate_eur: 123000,
    estimate_low_eur: 108000,
    estimate_high_eur: 144000,
  };
}

describe('InvestmentChapter', () => {
  it('opens with the city price and says the chapter is context, not score', async () => {
    await renderWithProviders(<InvestmentChapter report={readyReport()} onOpenChapter={vi.fn()} />);

    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent(
      /În Timișoara se cer în jur de 1\.984 € pe metru pătrat/,
    );
    expect(screen.getByText('Investiție · context, nu intră în scor')).toBeInTheDocument();
    expect(screen.getByText('Precizie: oraș')).toBeInTheDocument();
  });

  it('draws the city and the nearby localities with the typical apartment and legend', async () => {
    await renderWithProviders(<InvestmentChapter report={readyReport()} onOpenChapter={vi.fn()} />);

    expect(await screen.findByText('Timișoara, tot orașul')).toBeInTheDocument();
    expect(screen.getByText('Giroc, lângă oraș')).toBeInTheDocument();
    expect(screen.getByText('Dumbrăvița, lângă oraș')).toBeInTheDocument();
    expect(screen.getByText(/Apartamentul tipic din anunțuri: 53 m²/)).toBeInTheDocument();
    expect(screen.getByText('intervalul tipic')).toBeInTheDocument();
    expect(screen.getByText('prețul din mijloc')).toBeInTheDocument();
  });

  it('starts the slider from the declared area and changes the estimate on the spot', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<InvestmentChapter report={readyReport()} onOpenChapter={vi.fn()} />);

    expect(
      await screen.findByText('Pentru 58,5 m², cam 116.000 €, preț cerut.'),
    ).toBeInTheDocument();
    const thumb = screen.getByRole('slider', { name: 'Suprafața apartamentului' });
    expect(thumb).toHaveAttribute('aria-valuenow', '58.5');
    expect(screen.getByText('≈ 116.000 €')).toBeInTheDocument();

    thumb.focus();
    await user.keyboard('{ArrowRight}');
    expect(thumb).toHaveAttribute('aria-valuenow', '60');
    expect(screen.getByText('≈ 119.000 €')).toBeInTheDocument();
    expect(screen.getByText('Suprafața aleasă')).toBeInTheDocument();
  });

  it('shows rent, yield, the last months and every source with its link', async () => {
    await renderWithProviders(
      <InvestmentChapter report={readyReport(withArea)} onOpenChapter={vi.fn()} />,
    );

    expect(await screen.findByText('Chirie estimată')).toBeInTheDocument();
    expect(screen.getByText('Randament brut: 5% (baza nu este disponibilă)')).toBeInTheDocument();
    expect(screen.getByText('Din august, prețul cerut a urcat cu 45 €/m²')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: ro.report.chapters.investment.history.chartLabel }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ro.report.chapters.investment.sources.roles.history),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Deschide/ })).toHaveLength(2);
    expect(
      screen.getByText('Sunt prețuri cerute în anunțuri, nu prețuri de vânzare.'),
    ).toBeInTheDocument();
  });

  it('marks example figures and explains they are replaced by the first import', async () => {
    await renderWithProviders(
      <InvestmentChapter
        report={readyReport((investment) => {
          investment.rent = { ...(investment.rent as object), is_example: true };
        })}
        onOpenChapter={vi.fn()}
      />,
    );

    expect(await screen.findAllByText('exemplu')).not.toHaveLength(0);
    expect(screen.getByText(/se înlocuiesc la primul import/)).toBeInTheDocument();
  });

  it('hides the last-months card with fewer than two months', async () => {
    await renderWithProviders(
      <InvestmentChapter
        report={readyReport((investment) => {
          investment.history = null;
        })}
        onOpenChapter={vi.fn()}
      />,
    );

    expect(await screen.findByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.queryByText(/Istoric ·/)).not.toBeInTheDocument();
  });

  it('says it has no figures when the report carries no market data', async () => {
    await renderWithProviders(
      <InvestmentChapter report={readyReport(undefined, false)} onOpenChapter={vi.fn()} />,
    );

    expect(
      await screen.findByText('Încă nu avem prețuri cerute pentru orașul acesta'),
    ).toBeInTheDocument();
    expect(screen.getByText('Fără cifre, nu estimăm: n-ar fi cinstit.')).toBeInTheDocument();
    expect(screen.getByText('Fără date încă')).toBeInTheDocument();
  });

  it('is available in English', async () => {
    await renderWithProviders(
      <InvestmentChapter report={readyReport(withArea)} onOpenChapter={vi.fn()} />,
      { locale: 'en' },
    );

    expect(await screen.findByText(en.report.chapters.investment.badgeCity)).toBeInTheDocument();
    expect(screen.getByText('Estimated asking price')).toBeInTheDocument();
    expect(screen.getByText('Since August, the asking price rose by €45/m²')).toBeInTheDocument();
  });

  it('shows radius data without turning a market-wide rent median into an estimate', async () => {
    const report = readyReport((investment) => {
      investment.sale = { ...(investment.sale as object), precision: 'radius' };
      investment.rent = { basis: 'all', median_eur: 420 };
    });
    await renderWithProviders(<InvestmentChapter report={report} onOpenChapter={vi.fn()} />);

    expect(await screen.findByText(ro.report.chapters.investment.badgeRadius)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/În jurul adresei se cer/);
    expect(screen.queryByText(ro.report.chapters.investment.home.rent)).not.toBeInTheDocument();
  });

  it.each([
    ['radius', 'city', ro.report.chapters.investment.yield.scope.addressSaleCityRent],
    ['city', 'radius', ro.report.chapters.investment.yield.scope.citySaleAddressRent],
    ['radius', 'radius', ro.report.chapters.investment.yield.scope.address],
    ['radius', undefined, ro.report.chapters.investment.yield.scope.unknown],
  ] as const)('describes the yield inputs for sale %s and rent %s', async (sale, rent, label) => {
    const report = readyReport((investment) => {
      investment.sale = { ...(investment.sale as object), precision: sale };
      investment.rent = { ...(investment.rent as object), precision: rent };
    });
    await renderWithProviders(<InvestmentChapter report={report} onOpenChapter={vi.fn()} />);

    const yieldCard = await screen.findByRole('region', { name: /Chiria pe un an/ });
    expect(yieldCard).toHaveTextContent(label);
  });

  it('shows both transactions for one provider and explains the actual yield input prices', async () => {
    const source = {
      source: 'apartamente_org_index',
      period: '2026-11-01',
      url: 'https://apartamente.org/raport-piata/2026-11.csv',
    };
    const report = readyReport((investment) => {
      investment.sale = { ...(investment.sale as object), source, count: 102 };
      investment.rent = { ...(investment.rent as object), source, count: 19 };
      investment.yield = {
        gross_pct: 4.5,
        basis: { sale_eur_m2: 1872.4, rent_eur_m2: 7, sale_source: source, rent_source: source },
      };
    });
    await renderWithProviders(<InvestmentChapter report={report} onOpenChapter={vi.fn()} />);

    expect(await screen.findByText('Timișoara · vânzare · 102 apartamente')).toBeInTheDocument();
    expect(screen.getByText('Timișoara · închiriere · 19 apartamente')).toBeInTheDocument();
    expect(
      screen.getByText(/Calcul: 12 × 7 €\/m².*÷ 1\.872,4 €\/m².*noiembrie 2026/),
    ).toBeInTheDocument();
  });

  it.each([
    ['ro', /în 1 lună$/],
    ['en', /in 1 month$/],
  ] as const)('uses a singular month for adjacent observations in %s', async (locale, duration) => {
    const report = readyReport((investment) => {
      investment.history = {
        months: [
          { period: '2026-08-01', median_eur_m2: 1900 },
          { period: '2026-09-01', median_eur_m2: 2000 },
        ],
      };
    });
    await renderWithProviders(<InvestmentChapter report={report} onOpenChapter={vi.fn()} />, {
      locale,
    });
    expect(await screen.findByText(duration)).toBeInTheDocument();
  });
});
