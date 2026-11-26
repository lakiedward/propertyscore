import { act, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { changeLocale } from '@/i18n/i18n';
import en from '@/i18n/locales/en/smartCheck.json';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs, TEST_USER_ID } from '@/test/factories/auth';
import { buildProfile } from '@/test/factories/profile';
import { buildCheckOrder, buildReportRow } from '@/test/factories/smart-check-report';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const unlimitedAccessUrl = supabaseUrl('/rest/v1/smartcheck_unlimited_accounts');
const { address, latitude: lat, longitude: lng } = buildCheckOrder();
const location = { address, lat, lng };

const locales = [
  { locale: 'ro', copy: ro.check, freePrice: '0 lei', standardPrice: '30 lei' },
  { locale: 'en', copy: en.check, freePrice: 'RON 0', standardPrice: 'RON 30' },
] as const;

function checkoutEyebrow(template: string, price: string, stepNumber = 4) {
  return template
    .replace('{{product}}', 'Smart Check')
    .replace('{{price}}', price)
    .replace('{{number}}', String(stepNumber))
    .replace('{{total}}', '4');
}

type RenderOptions = NonNullable<Parameters<typeof renderAppRoute>[1]>;

function renderCheckout(step: 'address' | 'payment', options: RenderOptions = {}) {
  server.use(
    http.get(supabaseUrl('/rest/v1/profiles'), () =>
      HttpResponse.json(buildProfile({ locale: options.locale ?? 'ro' })),
    ),
  );
  return renderAppRoute(
    step === 'address'
      ? '/check'
      : `/check?step=payment&address=${encodeURIComponent(address)}&lat=${String(lat)}&lng=${String(lng)}`,
    options,
  );
}

describe('CheckPage', () => {
  it.each(locales)(
    'quotes zero throughout checkout for unlimited access in $locale',
    async ({ locale, copy, freePrice, standardPrice }) => {
      server.use(
        http.get(unlimitedAccessUrl, () => HttpResponse.json([{ user_id: TEST_USER_ID }])),
      );

      await renderCheckout('payment', { auth: signedInAs('user'), locale });

      expect(await screen.findByText(copy.payment.unlimited.description)).toBeVisible();
      expect(screen.getByRole('button', { name: copy.payment.generate })).toBeEnabled();
      const summary = within(screen.getByRole('complementary', { name: 'Smart Check' }));
      expect(await summary.findByText(copy.summary.total)).toBeVisible();
      expect(summary.getAllByText(freePrice)).toHaveLength(3);
      expect(summary.queryByText(standardPrice)).not.toBeInTheDocument();
      expect(screen.getByText(checkoutEyebrow(copy.eyebrow, freePrice))).toHaveTextContent(
        /^Smart Check /,
      );
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
      await renderCheckout('payment', { auth: signedInAs('user'), locale });

      const step = locale === 'ro' ? 'Pasul 4 din 4' : 'Step 4 of 4';
      expect(screen.getByText(`Smart Check · ${step}`)).toBeVisible();
      expect(screen.queryByText(copy.summary.total)).not.toBeInTheDocument();
      resolveAccess();

      expect(await screen.findByText(copy.payment.comingSoon.title)).toBeVisible();
      const summary = within(screen.getByRole('complementary', { name: 'Smart Check' }));
      expect(await summary.findByText(copy.summary.total)).toBeVisible();
      expect(summary.getAllByText(standardPrice)).toHaveLength(3);
      expect(screen.getByText(checkoutEyebrow(copy.eyebrow, standardPrice))).toBeVisible();
      expect(screen.queryByRole('button', { name: copy.payment.generate })).not.toBeInTheDocument();
    },
  );

  it('keeps the standard price and sign-in prompt for visitors', async () => {
    await renderCheckout('payment');

    const main = within(screen.getByRole('main'));
    expect(main.getByRole('link', { name: ro.check.payment.signedOut.signIn })).toBeVisible();
    const summary = within(screen.getByRole('complementary', { name: 'Smart Check' }));
    expect(summary.getByText(ro.check.summary.total)).toBeVisible();
    expect(summary.getAllByText('30 lei')).toHaveLength(3);
    expect(
      screen.queryByRole('button', { name: ro.check.payment.generate }),
    ).not.toBeInTheDocument();
  });

  it('reformats the same checkout price when the language changes', async () => {
    server.use(http.get(unlimitedAccessUrl, () => HttpResponse.json([{ user_id: TEST_USER_ID }])));
    await renderCheckout('payment', { auth: signedInAs('user') });

    const romanian = within(screen.getByRole('complementary', { name: 'Smart Check' }));
    expect(await romanian.findAllByText('0 lei')).toHaveLength(3);

    await act(async () => {
      await changeLocale('en');
    });

    const english = within(screen.getByRole('complementary', { name: 'Smart Check' }));
    expect(english.getAllByText('RON 0')).toHaveLength(3);
    expect(english.queryByText('0 lei')).not.toBeInTheDocument();
    expect(screen.getByText(checkoutEyebrow(en.check.eyebrow, 'RON 0'))).toBeVisible();
  });

  it('does not quote a total or offer generation when access cannot be checked', async () => {
    server.use(http.get(unlimitedAccessUrl, () => new HttpResponse(null, { status: 500 })));

    await renderCheckout('payment', { auth: signedInAs('user') });

    expect(await screen.findByText(ro.check.payment.accessError)).toBeVisible();
    expect(screen.queryByText(ro.check.summary.total)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: ro.check.payment.generate }),
    ).not.toBeInTheDocument();
  });

  it.each(
    locales.flatMap(({ locale, copy, freePrice, standardPrice }) => [
      { locale, copy, access: 'unlimited', price: freePrice },
      { locale, copy, access: 'standard', price: standardPrice },
      { locale, copy, access: 'error', price: null },
    ]),
  )(
    'keeps all stages consistent for $access access in $locale',
    async ({ locale, copy, access, price }) => {
      const report = buildReportRow({ status: 'queued', result: null });
      server.use(
        http.get(unlimitedAccessUrl, () =>
          access === 'error'
            ? new HttpResponse(null, { status: 500 })
            : HttpResponse.json(access === 'unlimited' ? [{ user_id: TEST_USER_ID }] : []),
        ),
        http.get(supabaseUrl('/rest/v1/online_reports'), () => HttpResponse.json([report])),
      );

      const { router } = await renderCheckout('address', { auth: signedInAs('user'), locale });
      const eyebrow = (step: number) =>
        price === null
          ? checkoutEyebrow(copy.eyebrowWithoutPrice, '', step)
          : checkoutEyebrow(copy.eyebrow, price, step);
      const includes =
        price === null
          ? copy.includes.titleWithoutPrice
          : copy.includes.title.replace('{{price}}', price);
      const continueLabel =
        price === null
          ? copy.details.continueWithoutPrice
          : copy.details.continue.replace('{{price}}', price);
      const assertNoIncorrectPrice = () => {
        const main = screen.getByRole('main');
        if (access !== 'standard') expect(main).not.toHaveTextContent(/30\s+lei|RON\s+30/);
        if (access !== 'unlimited') expect(main).not.toHaveTextContent(/(?:^|\D)0\s+lei|RON\s+0/);
      };

      expect(await within(screen.getByRole('main')).findByText(includes)).toBeVisible();
      expect(screen.getByText(eyebrow(1))).toBeVisible();
      assertNoIncorrectPrice();

      for (const [step, number] of [
        ['confirm', 2],
        ['details', 3],
        ['payment', 4],
        ['done', 4],
      ] as const) {
        await act(async () => {
          await router.navigate({
            to: '/check',
            search: { ...location, step, report: step === 'done' ? report.id : undefined },
          });
        });

        expect(screen.getByText(eyebrow(number))).toBeVisible();
        assertNoIncorrectPrice();
        if (step === 'details') {
          expect(
            screen.getByRole('button', {
              name: (name) => name.replaceAll(/\s+/g, ' ') === continueLabel,
            }),
          ).toBeEnabled();
        }
        if (step === 'payment') {
          const summary = within(screen.getByRole('complementary', { name: 'Smart Check' }));
          if (price === null) {
            expect(await screen.findByText(copy.payment.accessError)).toBeVisible();
            expect(summary.queryByText(copy.summary.total)).not.toBeInTheDocument();
          } else {
            expect(summary.getAllByText(price)).toHaveLength(3);
          }
        }
        if (step === 'done') expect(await screen.findByText(copy.done.queued)).toBeVisible();
      }
    },
  );
});
