import { screen } from '@testing-library/react';
import enPublish from '@/i18n/locales/en/publish.json';
import roPublish from '@/i18n/locales/ro/publish.json';
import { buildSession } from '@/test/factories/auth';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const signedIn = { session: buildSession(), user: buildSession().user };

function withoutTags(text: string) {
  return text.replace(/<\/?\w+>/g, '');
}

function stepTab(title: string) {
  return screen.getByRole('tab', { name: new RegExp(title) });
}

describe('PublishPage', { timeout: 20_000 }, () => {
  it('asks a signed-out owner to sign in and come back to the steps', async () => {
    await renderAppRoute('/publish');

    expect(
      await screen.findByRole('heading', { level: 1, name: withoutTags(roPublish.hero.title) }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: roPublish.hero.startSignedOut })).toHaveAttribute(
      'href',
      '/login?redirect=%2Fpublish%23steps',
    );
    expect(screen.getByRole('link', { name: roPublish.path.signUp })).toHaveAttribute(
      'href',
      '/sign-up?redirect=%2Fpublish%23steps',
    );
    expect(screen.getByText(roPublish.hero.accountHint)).toBeInTheDocument();
  });

  it('lets a signed-in owner go straight to the steps', async () => {
    await renderAppRoute('/publish', { auth: signedIn });

    expect(await screen.findByRole('link', { name: roPublish.hero.startSignedIn })).toHaveAttribute(
      'href',
      '#steps',
    );
    expect(screen.getByRole('link', { name: roPublish.path.continue })).toHaveAttribute(
      'href',
      '#steps',
    );
    expect(screen.queryByText(roPublish.hero.accountHint)).not.toBeInTheDocument();
  });

  it('renders the page in English', async () => {
    await renderAppRoute('/publish', { locale: 'en' });

    expect(
      await screen.findByRole('heading', { level: 1, name: withoutTags(enPublish.hero.title) }),
    ).toBeInTheDocument();
  });

  it('opens the step named in the address', async () => {
    await renderAppRoute('/publish?step=details');

    expect(
      await screen.findByRole('heading', { level: 3, name: roPublish.steps.items.details.title }),
    ).toBeInTheDocument();
    expect(stepTab(roPublish.steps.items.details.title)).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to the first step for an unknown step in the address', async () => {
    await renderAppRoute('/publish?step=unknown');

    expect(
      await screen.findByRole('heading', { level: 3, name: roPublish.steps.items.type.title }),
    ).toBeInTheDocument();
  });

  it('writes the chosen step into the address', async () => {
    const { user, router } = await renderAppRoute('/publish');

    await user.click(
      await screen.findByRole('tab', { name: new RegExp(roPublish.steps.items.photos.title) }),
    );

    expect(
      await screen.findByRole('heading', { level: 3, name: roPublish.steps.items.photos.title }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toEqual({ step: 'photos' });
  });
});
