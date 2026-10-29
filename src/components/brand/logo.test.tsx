import { screen } from '@testing-library/react';
import roCommon from '@/i18n/locales/ro/common.json';
import { renderWithProviders } from '@/test/render';
import { Logo } from './logo';

describe('Logo', () => {
  it.each([
    ['core', roCommon.brand.core],
    ['physical', roCommon.brand.physical],
    ['smartcheck', roCommon.brand.smartcheck],
  ] as const)('names the %s logo with its brand name', async (product, name) => {
    await renderWithProviders(<Logo product={product} />);

    expect(screen.getByRole('img', { name })).toBeInTheDocument();
  });

  it('stays out of the accessibility tree when decorative', async () => {
    await renderWithProviders(<Logo isDecorative />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
