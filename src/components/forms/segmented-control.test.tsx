import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { SegmentedControl } from './segmented-control';

describe('SegmentedControl', () => {
  it('marks the chosen option and reports a new choice', async () => {
    const onChange = vi.fn();
    await renderWithProviders(
      <SegmentedControl
        ariaLabel="Limba"
        value="ro"
        onChange={onChange}
        options={[
          { value: 'ro', label: 'RO', lang: 'ro' },
          { value: 'en', label: 'EN', lang: 'en' },
        ]}
      />,
    );
    const user = userEvent.setup();

    expect(screen.getByRole('radio', { name: 'RO' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: 'EN' }));
    expect(onChange).toHaveBeenCalledWith('en');
  });
});
