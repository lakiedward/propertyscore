import { getRouteApi } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TextLink } from '@/components/navigation/text-link';
import { AuthNotice } from './auth-notice';
import { AuthPageHeading } from './auth-page-heading';

const route = getRouteApi('/_public/auth/callback');

const EXPIRED_LINK_CODES = new Set(['otp_expired', 'flow_state_expired', 'flow_state_not_found']);

export function AuthCallbackPage() {
  const { t } = useTranslation('auth');
  const { error_code: errorCode, redirect } = route.useSearch();
  const isExpired = errorCode !== undefined && EXPIRED_LINK_CODES.has(errorCode);

  return (
    <>
      <AuthPageHeading title={t('callback.failedTitle')} />
      <AuthNotice tone="error">
        {isExpired ? t('callback.expired') : t('callback.failed')}
      </AuthNotice>
      <TextLink
        to="/login"
        search={{ redirect }}
        className="inline-flex items-center gap-1.5 self-start py-1"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        {t('callback.backToLogin')}
      </TextLink>
    </>
  );
}
