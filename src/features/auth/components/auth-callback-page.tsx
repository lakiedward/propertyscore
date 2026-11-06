import { getRouteApi } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { isExpiredLinkCode } from '../auth.utils';
import { ArrowLink } from './arrow-link';
import { AuthNotice } from './auth-notice';
import { AuthPageHeading } from './auth-page-heading';

const route = getRouteApi('/_public/auth/callback');

export function AuthCallbackPage() {
  const { t } = useTranslation('auth');
  const { error, error_code: errorCode, redirect } = route.useSearch();
  const message = isExpiredLinkCode(errorCode)
    ? t('callback.expired')
    : error === 'access_denied'
      ? t('callback.cancelled')
      : t('callback.failed');

  return (
    <>
      <AuthPageHeading title={t('callback.failedTitle')} />
      <AuthNotice tone="error">{message}</AuthNotice>
      <ArrowLink to="/login" search={{ redirect }} direction="back">
        {t('callback.backToLogin')}
      </ArrowLink>
    </>
  );
}
