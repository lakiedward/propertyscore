import { screen, within } from '@testing-library/react';
import roHome from '@/i18n/locales/ro/home.json';
import { renderWithProviders } from '@/test/render';
import { CriteriaExplorer } from './criteria-explorer';

const explorer = roHome.physical.explorer;
const chapters = explorer.chapters;
const labels = roHome.chapters;

function questionCount(count: number, form: 'few' | 'other') {
  const template = form === 'few' ? explorer.questionCount_few : explorer.questionCount_other;
  return template.replace('{{count}}', String(count));
}

describe('CriteriaExplorer', () => {
  it('shows the building questions first', async () => {
    await renderWithProviders(<CriteriaExplorer />);

    expect(screen.getByRole('heading', { name: chapters.building.title })).toBeInTheDocument();
    expect(
      screen.getByText(questionCount(chapters.building.questions.length, 'few')),
    ).toBeInTheDocument();
  });

  it('switches chapter from the tabs', async () => {
    const { user } = await renderWithProviders(<CriteriaExplorer />);

    await user.click(screen.getByRole('tab', { name: labels.comfort }));

    expect(screen.getByRole('heading', { name: chapters.comfort.title })).toBeInTheDocument();
    expect(
      screen.getByText(questionCount(chapters.comfort.questions.length, 'few')),
    ).toBeInTheDocument();
  });

  it('switches chapter from a pin on the illustration', async () => {
    const { user } = await renderWithProviders(<CriteriaExplorer />);
    const pins = screen.getByRole('group', { name: explorer.pinsLabel });

    await user.click(
      within(pins).getByRole('button', {
        name: explorer.pinLabel.replace('{{chapter}}', labels.risks),
      }),
    );

    expect(screen.getByRole('heading', { name: chapters.risks.title })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: labels.risks })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
