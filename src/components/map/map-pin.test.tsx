import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { MapPin } from './map-pin';

const NAME = 'Apartament 2 camere, 450 €';

describe('MapPin', () => {
  it('is a pressed button named after the listing when selected', async () => {
    await renderWithProviders(
      <MapPin
        kind="online"
        label="450 €"
        accessibleName={NAME}
        isActive
        isSelected
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: NAME })).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onSelect when pressed', async () => {
    const onSelect = vi.fn();
    const { user } = await renderWithProviders(
      <MapPin
        kind="none"
        label="450 €"
        accessibleName={NAME}
        isActive={false}
        isSelected={false}
        onSelect={onSelect}
      />,
    );
    const pin = screen.getByRole('button', { name: NAME });
    expect(pin).toHaveAttribute('aria-pressed', 'false');

    await user.click(pin);

    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('draws the brand pin forest with white text when it is not tied to a trust kind', async () => {
    await renderWithProviders(
      <MapPin
        kind="brand"
        label="97.000 €"
        accessibleName={NAME}
        isActive={false}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: NAME })).toHaveClass(
      'bg-primary',
      'text-primary-foreground',
    );
  });
});
