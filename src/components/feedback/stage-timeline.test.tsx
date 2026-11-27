import { screen } from '@testing-library/react';
import ro from '@/i18n/locales/ro/common.json';
import { renderWithProviders } from '@/test/render';
import { StageTimeline } from './stage-timeline';

describe('StageTimeline', () => {
  it('labels each stage with its state', async () => {
    await renderWithProviders(
      <StageTimeline
        label="Ce urmează"
        orientation="vertical"
        stages={[
          { id: 'a', label: 'Inspector alocat', state: 'done' },
          { id: 'b', label: 'Inspecția', state: 'current', meta: 'marți' },
          { id: 'c', label: 'Book gata', state: 'cancelled' },
        ]}
      />,
    );

    expect(screen.getByText(ro.stageTimeline.state.done)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText(ro.stageTimeline.state.cancelled)).toBeInTheDocument();
    expect(screen.getByText('marți')).toBeInTheDocument();
  });
});
