import { screen, within } from '@testing-library/react';
import roHome from '@/i18n/locales/ro/home.json';
import { renderWithProviders } from '@/test/render';
import { PhysicalSection } from './physical-section';

const journey = roHome.physical.journey;
const finding = roHome.physical.finding;

describe('PhysicalSection', () => {
  it('shows the seller steps when the role changes', async () => {
    const { user } = await renderWithProviders(<PhysicalSection />);
    expect(screen.getByText(journey.buyer[0]?.title ?? '')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: journey.roles.seller }));

    expect(screen.getByText(journey.seller[1]?.title ?? '')).toBeInTheDocument();
    expect(screen.queryByText(journey.buyer[0]?.title ?? '')).not.toBeInTheDocument();
  });

  it('opens the finding example and switches between findings', async () => {
    const { user } = await renderWithProviders(<PhysicalSection />);

    await user.click(screen.getByRole('button', { name: finding.open }));
    expect(
      screen.getByRole('heading', { name: finding.examples.windows.title }),
    ).toBeInTheDocument();

    await user.click(
      within(screen.getByRole('tablist', { name: finding.tabsLabel })).getByRole('tab', {
        name: finding.examples.systems.tab,
      }),
    );
    expect(
      screen.getByRole('heading', { name: finding.examples.systems.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(finding.examples.systems.status)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: finding.close }));
    expect(
      screen.queryByRole('heading', { name: finding.examples.systems.title }),
    ).not.toBeInTheDocument();
  });
});
