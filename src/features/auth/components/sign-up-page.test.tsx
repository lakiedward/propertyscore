import { waitFor } from '@testing-library/react';
import { buildSession } from '@/test/factories/auth';
import { renderAppRoute } from '@/test/render';

const signedIn = { session: buildSession(), user: buildSession().user };

describe('SignUpPage', () => {
  it('sends a signed-in visitor to the page named in redirect', async () => {
    const { router } = await renderAppRoute('/sign-up?redirect=%2Fpublish', { auth: signedIn });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/publish');
    });
  });

  it('ignores a redirect to another site', async () => {
    const { router } = await renderAppRoute('/sign-up?redirect=%2F%2Fevil.example', {
      auth: signedIn,
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/account');
    });
  });
});
