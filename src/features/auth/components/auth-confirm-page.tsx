import { getRouteApi, Navigate } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TextLink } from '@/components/navigation/text-link';
import { useAuth } from '../auth-context';
import { emailLinkTarget } from '../auth.utils';
import { AuthNotice } from './auth-notice';
import { AuthPageHeading } from './auth-page-heading';

const route = getRouteApi('/_public/auth/confirm');

export function AuthConfirmPage() {
  const { t } = useTranslation('auth');
  const { type, next } = route.useSearch();
  const result = route.useLoaderData();
  const { session, roles } = useAuth();

  if (result.status === 'verified') {
    if (session) {
      return <Navigate to={emailLinkTarget(type, next, roles)} replace />;
    }
    return <AuthPageHeading title={t('confirm.pending')} />;
  }

  const isExpired = result.status === 'expired';
  const isRecovery = type === 'recovery';

  return (
    <>
      <AuthPageHeading title={isExpired ? t('confirm.expiredTitle') : t('confirm.invalidTitle')} />
      <AuthNotice tone="warning">
        {isExpired ? t('confirm.expired') : t('confirm.invalid')}
      </AuthNotice>
      {isRecovery ? (
        <TextLink to="/password-reset" className="inline-flex items-center gap-1.5 self-start py-1">
          {t('confirm.newResetLink')}
          <ArrowRightIcon aria-hidden className="size-4" />
        </TextLink>
      ) : (
        <>
          <p className="text-body text-muted-foreground">{t('confirm.signInHint')}</p>
          <TextLink to="/login" className="inline-flex items-center gap-1.5 self-start py-1">
            {t('confirm.signIn')}
            <ArrowRightIcon aria-hidden className="size-4" />
          </TextLink>
        </>
      )}
    </>
  );
}
