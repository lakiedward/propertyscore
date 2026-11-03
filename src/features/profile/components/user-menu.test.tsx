import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { signInWithPassword, signOut } from '@/features/auth';
import roCommon from '@/i18n/locales/ro/common.json';
import { signedInAs } from '@/test/factories/auth';
import { buildProfile } from '@/test/factories/profile';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { UserMenu } from './user-menu';

const MENU = roCommon.panel.userMenu;
const auth = signedInAs();

async function openMenu() {
  const { user } = await renderWithProviders(
    auth.user ? <UserMenu user={auth.user} tone="light" /> : null,
    { auth },
  );
  await user.click(await screen.findByRole('button', { name: /Ana Mărginean/u }));
  return user;
}

describe('UserMenu', { timeout: 20_000 }, () => {
  it('shows the name, initials and email from the profile', async () => {
    await openMenu();

    expect(screen.getByRole('menu')).toHaveTextContent('ana.ro@example.test');
    expect(screen.getByText('AM')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: MENU.profile })).toHaveAttribute(
      'href',
      '/account/settings',
    );
  });

  it('opens the panel for the role from the public site', async () => {
    const { user } = await renderWithProviders(
      auth.user ? <UserMenu user={auth.user} tone="light" panelPath="/admin" isNameHidden /> : null,
      { auth },
    );

    await user.click(await screen.findByRole('button', { name: /Ana Mărginean/u }));

    expect(screen.getByRole('menuitem', { name: MENU.openAdmin })).toHaveAttribute(
      'href',
      '/admin',
    );
  });

  it('has no panel link inside the panels', async () => {
    await openMenu();

    expect(screen.queryByRole('menuitem', { name: MENU.openAccount })).not.toBeInTheDocument();
  });

  it('falls back to the email while the profile has no name', async () => {
    server.use(
      http.get(supabaseUrl('/rest/v1/profiles'), () =>
        HttpResponse.json(buildProfile({ full_name: null })),
      ),
    );
    const { user } = await renderWithProviders(
      auth.user ? <UserMenu user={auth.user} tone="inverse" appRole="admin" /> : null,
      { auth },
    );

    await user.click(await screen.findByRole('button', { name: /ana\.ro@example\.test/u }));

    expect(screen.getAllByText(MENU.role.admin).length).toBeGreaterThan(0);
  });

  it('switches the language and saves it on the profile', async () => {
    const updates: unknown[] = [];
    server.use(
      http.patch(supabaseUrl('/rest/v1/profiles'), async ({ request }) => {
        updates.push(await request.json());
        return HttpResponse.json(buildProfile({ locale: 'en' }));
      }),
    );
    const user = await openMenu();

    await user.click(screen.getByRole('menuitem', { name: roCommon.language.en }));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('lang', 'en');
    });
    expect(updates).toEqual([{ locale: 'en' }]);
  });

  it('signs out', async () => {
    await signInWithPassword({ email: 'ana.ro@example.test', password: 'Parola-Test-2026' });
    let signOutCalls = 0;
    server.use(
      http.post(supabaseUrl('/auth/v1/logout'), () => {
        signOutCalls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = await openMenu();

    await user.click(screen.getByRole('menuitem', { name: MENU.signOut }));

    await waitFor(() => {
      expect(signOutCalls).toBe(1);
    });
    await signOut();
  });
});
