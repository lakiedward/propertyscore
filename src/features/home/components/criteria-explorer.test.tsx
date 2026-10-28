import { screen, within } from '@testing-library/react';
import roHome from '@/i18n/locales/ro/home.json';
import { renderWithProviders } from '@/test/render';
import { CriteriaExplorer } from './criteria-explorer';

const chapters = roHome.physical.explorer.chapters;

describe('CriteriaExplorer', () => {
  it('shows the building questions first', async () => {
    await renderWithProviders(<CriteriaExplorer />);

    expect(screen.getByRole('heading', { name: chapters.building.title })).toBeInTheDocument();
    expect(screen.getByText('8 întrebări urmărite')).toBeInTheDocument();
  });

  it('switches chapter from the tabs', async () => {
    const { user } = await renderWithProviders(<CriteriaExplorer />);

    await user.click(screen.getByRole('tab', { name: chapters.comfort.label }));

    expect(screen.getByRole('heading', { name: chapters.comfort.title })).toBeInTheDocument();
    expect(screen.getByText('5 întrebări urmărite')).toBeInTheDocument();
  });

  it('switches chapter from a pin on the illustration', async () => {
    const { user } = await renderWithProviders(<CriteriaExplorer />);
    const pins = screen.getByRole('group', { name: roHome.physical.explorer.pinsLabel });

    await user.click(
      within(pins).getByRole('button', {
        name: roHome.physical.explorer.pinLabel.replace('{{chapter}}', chapters.risks.label),
      }),
    );

    expect(screen.getByRole('heading', { name: chapters.risks.title })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: chapters.risks.label })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
