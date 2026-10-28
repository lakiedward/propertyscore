import { screen } from '@testing-library/react';
import roHome from '@/i18n/locales/ro/home.json';
import { renderWithProviders } from '@/test/render';
import { HomeFaq } from './home-faq';

const [first, second] = roHome.faq.items;

describe('HomeFaq', () => {
  it('opens several answers at once', async () => {
    const { user } = await renderWithProviders(<HomeFaq />);

    await user.click(screen.getByRole('button', { name: first?.q }));
    await user.click(screen.getByRole('button', { name: second?.q }));

    expect(screen.getByText(first?.a ?? '')).toBeVisible();
    expect(screen.getByText(second?.a ?? '')).toBeVisible();
  });
});
