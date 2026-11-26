import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { InitialsAvatar } from './initials-avatar';

describe('InitialsAvatar', () => {
  it('shows the initials of the name, hidden from screen readers', async () => {
    await renderWithProviders(<InitialsAvatar name="Elena Matei" />);

    const avatar = await screen.findByText('EM');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
    expect(avatar).toHaveClass('size-8', 'bg-primary');
  });

  it('takes its size and tone from the variants', async () => {
    await renderWithProviders(<InitialsAvatar name="ion popescu" size="lg" tone="soft" />);

    expect(await screen.findByText('IP')).toHaveClass('size-10', 'bg-secondary', 'text-brand');
  });
});
