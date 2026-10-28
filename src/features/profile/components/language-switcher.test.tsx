import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import enCommon from '@/i18n/locales/en/common.json';
import roCommon from '@/i18n/locales/ro/common.json';
import { buildProfile } from '@/test/factories/profile';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { LanguageSwitcher } from './language-switcher';

describe('LanguageSwitcher', () => {
  it('switches the interface to English without saving when signed out', async () => {
    const { user } = await renderWithProviders(<LanguageSwitcher />);

    await user.click(screen.getByRole('button', { name: roCommon.language.label }));
    await user.click(screen.getByRole('menuitemradio', { name: enCommon.language.en }));

    expect(
      await screen.findByRole('button', { name: enCommon.language.label }),
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('locale')).toBe('en');
  });

  it('saves the choice on the profile when signed in', async () => {
    const updates: unknown[] = [];
    server.use(
      http.patch(supabaseUrl('/rest/v1/profiles'), async ({ request }) => {
        updates.push(await request.json());
        return HttpResponse.json(buildProfile({ locale: 'en' }));
      }),
    );
    const { user } = await renderWithProviders(<LanguageSwitcher userId={buildProfile().id} />);

    await user.click(screen.getByRole('button', { name: roCommon.language.label }));
    await user.click(screen.getByRole('menuitemradio', { name: enCommon.language.en }));

    await waitFor(() => {
      expect(updates).toEqual([{ locale: 'en' }]);
    });
  });

  it('switches language from the segmented control', async () => {
    const { user } = await renderWithProviders(<LanguageSwitcher variant="segmented" />);

    await user.click(screen.getByRole('radio', { name: enCommon.language.en }));

    expect(await screen.findByRole('radio', { name: enCommon.language.en })).toBeChecked();
    expect(document.documentElement.lang).toBe('en');
  });
});
