import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import en from '@/i18n/locales/en/smartCheck.json';
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
    await renderWithProviders(
      <InvestmentChapter report={readyReport(withArea)} onOpenChapter={vi.fn()} />,
    );

    expect(await screen.findByText('Pentru 62 m², cam 123.000 €, preț cerut.')).toBeInTheDocument();
    const thumb = screen.getByRole('slider', { name: 'Suprafața apartamentului' });
    expect(thumb).toHaveAttribute('aria-valuenow', '62');
    expect(screen.getByText('≈ 123.000 €')).toBeInTheDocument();

    thumb.focus();
    await user.keyboard('{ArrowRight}');
    expect(thumb).toHaveAttribute('aria-valuenow', '63');
    expect(screen.getByText('≈ 125.000 €')).toBeInTheDocument();
    expect(screen.getByText('Suprafața aleasă')).toBeInTheDocument();
  });

  it('shows rent, yield, the last months and every source with its link', async () => {
    await renderWithProviders(
      <InvestmentChapter report={readyReport(withArea)} onOpenChapter={vi.fn()} />,
    );

    expect(await screen.findByText('Chirie estimată')).toBeInTheDocument();
    expect(screen.getByText('Chiria pe un an înseamnă 5% din preț')).toBeInTheDocument();
    expect(screen.getByText('Din aug, prețul cerut a urcat cu 45 €/m²')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /lună cu lună/ })).toBeInTheDocument();
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
    expect(screen.queryByText(/Ultimele/)).not.toBeInTheDocument();
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
    expect(screen.getByText('Since Aug, the asking price rose by €45/m²')).toBeInTheDocument();
  });
});
