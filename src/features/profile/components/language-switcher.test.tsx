import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import enCommon from '@/i18n/locales/en/common.json';
import roCommon from '@/i18n/locales/ro/common.json';
import { buildProfile } from '@/test/factories/profile';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { LanguageSwitcher } from './language-switcher';

function menuTriggerName(text: { language: { label: string } }) {
  return new RegExp(`^${text.language.label}`);
}

describe('LanguageSwitcher', () => {
  it('names the menu button with its visible language code', async () => {
    await renderWithProviders(<LanguageSwitcher />);

    expect(screen.getByRole('button', { name: menuTriggerName(roCommon) })).toHaveAccessibleName(
      expect.stringContaining(roCommon.language.short.ro),
    );
  });

  it('switches the interface to English without saving when signed out', async () => {
    const { user } = await renderWithProviders(<LanguageSwitcher />);

    await user.click(screen.getByRole('button', { name: menuTriggerName(roCommon) }));
    await user.click(screen.getByRole('menuitemradio', { name: enCommon.language.en }));

    expect(
      await screen.findByRole('button', { name: menuTriggerName(enCommon) }),
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

    await user.click(screen.getByRole('button', { name: menuTriggerName(roCommon) }));
    await user.click(screen.getByRole('menuitemradio', { name: enCommon.language.en }));

    await waitFor(() => {
      expect(updates).toEqual([{ locale: 'en' }]);
    });
  });

  it('goes back to the previous language when the profile cannot be saved', async () => {
    server.use(
      http.patch(supabaseUrl('/rest/v1/profiles'), () =>
        HttpResponse.json({ code: 'XX000', message: 'failed', details: null }, { status: 500 }),
      ),
    );
    const { user } = await renderWithProviders(
      <LanguageSwitcher userId={buildProfile().id} variant="segmented" tone="light" />,
    );

    await user.click(screen.getByRole('radio', { name: enCommon.language.en }));

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('ro');
    });
    expect(screen.getByRole('radio', { name: roCommon.language.ro })).toBeChecked();
  });

  it('does not save the choice when no user is given', async () => {
    const updates: unknown[] = [];
    server.use(
      http.patch(supabaseUrl('/rest/v1/profiles'), () => {
        updates.push('patch');
        return HttpResponse.json(buildProfile({ locale: 'en' }));
      }),
    );
    const { user } = await renderWithProviders(
      <LanguageSwitcher variant="segmented" tone="light" />,
    );

    await user.click(screen.getByRole('radio', { name: enCommon.language.en }));

    expect(await screen.findByRole('radio', { name: enCommon.language.en })).toBeChecked();
    expect(updates).toEqual([]);
  });

  it('switches language from the segmented control', async () => {
    const { user } = await renderWithProviders(<LanguageSwitcher variant="segmented" />);

    await user.click(screen.getByRole('radio', { name: enCommon.language.en }));

    expect(await screen.findByRole('radio', { name: enCommon.language.en })).toBeChecked();
    expect(document.documentElement.lang).toBe('en');
  });
});
