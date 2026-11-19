import { act, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roAuth from '@/i18n/locales/ro/auth.json';
import roCommon from '@/i18n/locales/ro/common.json';
import { authErrorResponse } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { ConfirmEmailCard } from './confirm-email-card';

function otherEmailAction(): string {
  return roAuth.otherEmail.replace(/^.*<action>(.*)<\/action>.*$/, '$1');
}

function waitText(count: number): string {
  return roAuth.resend.wait.replace('{{count}}', String(count));
}

async function renderCard(isRepeat = false) {
  const onUseOtherEmail = vi.fn();
  const view = await renderWithProviders(
    <ConfirmEmailCard
      email="nou@example.test"
      isRepeat={isRepeat}
      redirect="/publish"
      onUseOtherEmail={onUseOtherEmail}
    />,
  );
  return { ...view, onUseOtherEmail };
}

describe('ConfirmEmailCard', { timeout: 20_000 }, () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the address and waits a minute before the link can be sent again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await renderCard();

    expect(screen.getByText('nou@example.test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: waitText(60) })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(screen.getByRole('button', { name: roAuth.resend.action })).toBeEnabled();
  });

  it('sends the link again to the same address and the asked page', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const resends: { body: unknown; redirectTo: string | null }[] = [];
    server.use(
      http.post(supabaseUrl('/auth/v1/resend'), async ({ request }) => {
        resends.push({
          body: await request.json(),
          redirectTo: new URL(request.url).searchParams.get('redirect_to'),
        });
        return HttpResponse.json({});
      }),
    );
    const { user } = await renderCard();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    await user.click(screen.getByRole('button', { name: roAuth.resend.action }));

    expect(await screen.findByText(roAuth.resend.sent)).toBeInTheDocument();
    expect(resends[0]?.body).toEqual(
      expect.objectContaining({ type: 'signup', email: 'nou@example.test' }),
    );
    expect(new URL(resends[0]?.redirectTo ?? '').searchParams.get('redirect')).toBe('/publish');
    expect(screen.getByRole('button', { name: waitText(60) })).toBeDisabled();
  });

  it('explains a rate limit', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    server.use(
      http.post(supabaseUrl('/auth/v1/resend'), () =>
        authErrorResponse('over_email_send_rate_limit', 429),
      ),
    );
    const { user } = await renderCard();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    await user.click(screen.getByRole('button', { name: roAuth.resend.action }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      roCommon.errors.reasons.rate_limited,
    );
    expect(screen.getByRole('button', { name: roAuth.resend.action })).toBeEnabled();
  });

  it('explains a repeated sign-up and lets the visitor use another address', async () => {
    const { user, onUseOtherEmail } = await renderCard(true);

    expect(screen.getByText(roAuth.confirmEmail.repeatTitle)).toBeInTheDocument();
    expect(screen.getByText(roAuth.confirmEmail.repeat)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: otherEmailAction() }));

    expect(onUseOtherEmail).toHaveBeenCalledOnce();
  });
});
