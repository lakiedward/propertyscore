import { screen } from '@testing-library/react';
import roPublish from '@/i18n/locales/ro/publish.json';
import { renderWithProviders } from '@/test/render';
import { StepsExplorer } from './steps-explorer';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const items = roPublish.steps.items;

function stepTab(title: string) {
  return screen.getByRole('tab', { name: new RegExp(title) });
}

describe('StepsExplorer', () => {
  it('opens on the first step with previous disabled', async () => {
    await renderWithProviders(<StepsExplorer activeKey="type" onStepChange={vi.fn()} />);

    expect(screen.getByRole('heading', { name: items.type.title })).toBeInTheDocument();
    expect(stepTab(items.type.title)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: roPublish.steps.previous })).toBeDisabled();
  });

  it('shows the step it is given', async () => {
    await renderWithProviders(<StepsExplorer activeKey="details" onStepChange={vi.fn()} />);

    expect(stepTab(items.details.title)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: items.details.title })).toBeInTheDocument();
    expect(screen.getByText(items.details.tip)).toBeInTheDocument();
  });

  it('asks for the step chosen on the rail', async () => {
    const handleStepChange = vi.fn();
    const { user } = await renderWithProviders(
      <StepsExplorer activeKey="type" onStepChange={handleStepChange} />,
    );

    await user.click(stepTab(items.details.title));

    expect(handleStepChange).toHaveBeenCalledWith('details');
  });

  it('asks for the next step with the arrow keys', async () => {
    const handleStepChange = vi.fn();
    const { user } = await renderWithProviders(
      <StepsExplorer activeKey="type" onStepChange={handleStepChange} />,
    );

    await user.click(stepTab(items.type.title));
    await user.keyboard('{ArrowRight}');

    expect(handleStepChange).toHaveBeenCalledWith('photos');
  });

  it('asks for the neighbouring steps with the previous and next buttons', async () => {
    const handleStepChange = vi.fn();
    const { user } = await renderWithProviders(
      <StepsExplorer activeKey="location" onStepChange={handleStepChange} />,
    );

    await user.click(screen.getByRole('button', { name: roPublish.steps.next }));
    expect(handleStepChange).toHaveBeenLastCalledWith('contact');

    await user.click(screen.getByRole('button', { name: roPublish.steps.previous }));
    expect(handleStepChange).toHaveBeenLastCalledWith('details');
  });

  it('disables next on the last step', async () => {
    await renderWithProviders(<StepsExplorer activeKey="contact" onStepChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: roPublish.steps.next })).toBeDisabled();
  });

  it('shows the example map on the address step', async () => {
    await renderWithProviders(<StepsExplorer activeKey="location" onStepChange={vi.fn()} />);

    expect(await screen.findByText(roPublish.steps.preview.mapNote)).toBeInTheDocument();
    expect(screen.getAllByText(roPublish.steps.preview.mapLabel)).not.toHaveLength(0);
  });
});
