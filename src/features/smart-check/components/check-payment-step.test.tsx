import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import en from '@/i18n/locales/en/smartCheck.json';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs, TEST_USER_ID } from '@/test/factories/auth';
import { buildCheckOrder } from '@/test/factories/smart-check-report';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { CheckPaymentStep } from './check-payment-step';

const unlimitedAccessUrl = supabaseUrl('/rest/v1/smartcheck_unlimited_accounts');

const locales = [
  { locale: 'ro', copy: ro.check, freePrice: '0 lei', standardPrice: '30 lei' },
  { locale: 'en', copy: en.check, freePrice: 'RON 0', standardPrice: 'RON 30' },
] as const;

function checkoutEyebrow(template: string, price: string) {
  return template.replace('{{price}}', price).replace('{{number}}', '4').replace('{{total}}', '4');
}

async function renderPaymentStep(options: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(
    <CheckPaymentStep
      order={buildCheckOrder()}
      onBack={vi.fn()}
      onChangeAddress={vi.fn()}
      onCreated={vi.fn()}
    />,
    options,
  );
}

describe('CheckPaymentStep', () => {
  it.each(locales)(
    'quotes zero throughout checkout for unlimited access in $locale',
    async ({ locale, copy, freePrice, standardPrice }) => {
      server.use(
        http.get(unlimitedAccessUrl, () => HttpResponse.json([{ user_id: TEST_USER_ID }])),
      );

      await renderPaymentStep({ auth: signedInAs('user'), locale });

      expect(await screen.findByText(copy.payment.unlimited.description)).toBeVisible();
      expect(screen.getByRole('button', { name: copy.payment.generate })).toBeEnabled();
      const summary = within(screen.getByRole('complementary', { name: copy.summary.product }));
      expect(await summary.findByText(copy.summary.total)).toBeVisible();
      expect(summary.getAllByText(freePrice)).toHaveLength(3);
      expect(summary.queryByText(standardPrice)).not.toBeInTheDocument();
      expect(screen.getByText(checkoutEyebrow(copy.eyebrow, freePrice))).toBeVisible();
      expect(
        screen.queryByText(checkoutEyebrow(copy.eyebrow, standardPrice)),
      ).not.toBeInTheDocument();
    },
  );

  it.each(locales)(
    'keeps the standard price and unavailable payment in $locale',
    async ({ locale, copy, standardPrice }) => {
      let resolveAccess: () => void = () => undefined;
      const access = new Promise<void>((resolve) => {
        resolveAccess = resolve;
      });
      server.use(
        http.get(unlimitedAccessUrl, async () => {
          await access;
          return HttpResponse.json([]);
        }),
      );
      await renderPaymentStep({ auth: signedInAs('user'), locale });

      expect(screen.queryByText(copy.summary.total)).not.toBeInTheDocument();
      resolveAccess();

      expect(await screen.findByText(copy.payment.comingSoon.title)).toBeVisible();
      const summary = within(screen.getByRole('complementary', { name: copy.summary.product }));
      expect(await summary.findByText(copy.summary.total)).toBeVisible();
      expect(summary.getAllByText(standardPrice)).toHaveLength(3);
      expect(screen.getByText(checkoutEyebrow(copy.eyebrow, standardPrice))).toBeVisible();
      expect(screen.queryByRole('button', { name: copy.payment.generate })).not.toBeInTheDocument();
    },
  );

  it('keeps the standard price and sign-in prompt for visitors', async () => {
    await renderPaymentStep();

    expect(screen.getByRole('link', { name: ro.check.payment.signedOut.signIn })).toBeVisible();
    const summary = within(screen.getByRole('complementary', { name: ro.check.summary.product }));
    expect(summary.getByText(ro.check.summary.total)).toBeVisible();
    expect(summary.getAllByText('30 lei')).toHaveLength(3);
    expect(
      screen.queryByRole('button', { name: ro.check.payment.generate }),
    ).not.toBeInTheDocument();
  });

  it('does not quote a total or offer generation when access cannot be checked', async () => {
    server.use(http.get(unlimitedAccessUrl, () => new HttpResponse(null, { status: 500 })));

    await renderPaymentStep({ auth: signedInAs('user') });

    expect(await screen.findByText(ro.check.payment.accessError)).toBeVisible();
    expect(screen.queryByText(ro.check.summary.total)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: ro.check.payment.generate }),
    ).not.toBeInTheDocument();
  });
});
