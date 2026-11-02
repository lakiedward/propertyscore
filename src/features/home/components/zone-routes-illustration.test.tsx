import { screen } from '@testing-library/react';
import roHome from '@/i18n/locales/ro/home.json';
import { renderWithProviders } from '@/test/render';
import { ZoneRoutesIllustration } from './zone-routes-illustration';

const map = roHome.deliverables.zone.map;

describe('ZoneRoutesIllustration', () => {
  it('highlights the routes of the chosen category and goes back to all of them', async () => {
    const { user } = await renderWithProviders(<ZoneRoutesIllustration />);
    const all = screen.getByRole('button', { name: map.all });

    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(map.status.all)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: new RegExp(map.filters.school.name) }));

    expect(screen.getByText(map.status.school)).toBeInTheDocument();
    expect(all).toHaveAttribute('aria-pressed', 'false');

    await user.click(all);

    expect(screen.getByText(map.status.all)).toBeInTheDocument();
  });
});
