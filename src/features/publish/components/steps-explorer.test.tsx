import { screen } from '@testing-library/react';
import roPublish from '@/i18n/locales/ro/publish.json';
import { renderWithProviders } from '@/test/render';
import { StepsExplorer } from './steps-explorer';

const items = roPublish.steps.items;

function stepTab(title: string) {
  return screen.getByRole('tab', { name: new RegExp(title) });
}

describe('StepsExplorer', () => {
  it('opens on the first step with previous disabled', async () => {
    await renderWithProviders(<StepsExplorer />);

    expect(screen.getByRole('heading', { name: items.type.title })).toBeInTheDocument();
    expect(stepTab(items.type.title)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: roPublish.steps.previous })).toBeDisabled();
  });

  it('switches step from the rail', async () => {
    const { user } = await renderWithProviders(<StepsExplorer />);

    await user.click(stepTab(items.details.title));

    expect(screen.getByRole('heading', { name: items.details.title })).toBeInTheDocument();
    expect(screen.getByText(items.details.tip)).toBeInTheDocument();
  });

  it('moves with the arrow keys', async () => {
    const { user } = await renderWithProviders(<StepsExplorer />);

    await user.click(stepTab(items.type.title));
    await user.keyboard('{ArrowRight}');

    expect(stepTab(items.photos.title)).toHaveAttribute('aria-selected', 'true');
  });

  it('walks forward with the next button and stops on the last step', async () => {
    const { user } = await renderWithProviders(<StepsExplorer />);

    await user.click(screen.getByRole('button', { name: roPublish.steps.next }));
    expect(screen.getByRole('heading', { name: items.photos.title })).toBeInTheDocument();

    await user.click(stepTab(items.contact.title));
    expect(screen.getByRole('button', { name: roPublish.steps.next })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: roPublish.steps.previous }));
    expect(screen.getByRole('heading', { name: items.location.title })).toBeInTheDocument();
  });
});
