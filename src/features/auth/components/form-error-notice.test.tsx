import { screen } from '@testing-library/react';
import roAuth from '@/i18n/locales/ro/auth.json';
import roCommon from '@/i18n/locales/ro/common.json';
import { AppError } from '@/lib/errors';
import { renderWithProviders } from '@/test/render';
import { FormErrorNotice } from './form-error-notice';

const TITLE = roAuth.settings.password.failedTitle;
const FALLBACK = roAuth.settings.password.failedText;

describe('FormErrorNotice', () => {
  it('prefers the message given for the reason', async () => {
    await renderWithProviders(
      <FormErrorNotice
        error={new AppError('validation', 'expired', { reason: 'link_expired' })}
        title={TITLE}
        fallback={FALLBACK}
        reasonMessages={{ link_expired: roAuth.settings.delete.failedText }}
      />,
    );

    expect(await screen.findByText(TITLE)).toBeInTheDocument();
    expect(screen.getByText(roAuth.settings.delete.failedText)).toBeInTheDocument();
    expect(screen.queryByText(roCommon.errors.reasons.link_expired)).not.toBeInTheDocument();
  });

  it('translates the reason when no message is given for it', async () => {
    await renderWithProviders(
      <FormErrorNotice
        error={new AppError('unknown', 'too many', { reason: 'rate_limited' })}
        title={TITLE}
        fallback={FALLBACK}
      />,
    );

    expect(await screen.findByText(roCommon.errors.reasons.rate_limited)).toBeInTheDocument();
    expect(screen.queryByText(FALLBACK)).not.toBeInTheDocument();
  });

  it('translates a known error code', async () => {
    await renderWithProviders(
      <FormErrorNotice
        error={new AppError('network', 'Failed to fetch')}
        title={TITLE}
        fallback={FALLBACK}
      />,
    );

    expect(await screen.findByText(roCommon.errors.network)).toBeInTheDocument();
    expect(screen.queryByText(FALLBACK)).not.toBeInTheDocument();
  });

  it('shows the fallback for an unknown error', async () => {
    await renderWithProviders(
      <FormErrorNotice error={new AppError('unknown', 'boom')} title={TITLE} fallback={FALLBACK} />,
    );

    expect(await screen.findByText(FALLBACK)).toBeInTheDocument();
    expect(screen.queryByText(roCommon.errors.unknown)).not.toBeInTheDocument();
  });

  it('shows the fallback for an error that is not an AppError', async () => {
    await renderWithProviders(
      <FormErrorNotice error={new Error('boom')} title={TITLE} fallback={FALLBACK} />,
    );

    expect(await screen.findByText(FALLBACK)).toBeInTheDocument();
  });
});
