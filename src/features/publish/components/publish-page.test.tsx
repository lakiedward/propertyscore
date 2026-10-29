import { screen } from '@testing-library/react';
import enPublish from '@/i18n/locales/en/publish.json';
import roPublish from '@/i18n/locales/ro/publish.json';
import { buildSession } from '@/test/factories/auth';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => ({
  MapCanvas: ({ label }: { label: string }) => <div role="region" aria-label={label} />,
}));

const signedIn = { session: buildSession(), user: buildSession().user };

describe('PublishPage', { timeout: 20_000 }, () => {
  it('asks a signed-out owner to sign in and come back to the steps', async () => {
    await renderAppRoute('/publish');

    expect(
      await screen.findByRole('heading', { level: 1, name: new RegExp(roPublish.hero.titleLead) }),
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
      await screen.findByRole('heading', { level: 1, name: new RegExp(enPublish.hero.titleLead) }),
    ).toBeInTheDocument();
  });
});
