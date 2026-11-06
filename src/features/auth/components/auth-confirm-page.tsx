import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi, Navigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { authQueries } from '../api/auth.queries';
import { useAuth } from '../auth-context';
import { emailLinkTarget } from '../auth.utils';
import { ArrowLink } from './arrow-link';
import { AuthNotice } from './auth-notice';
import { AuthPageHeading } from './auth-page-heading';

const route = getRouteApi('/_public/auth/confirm');

export function AuthConfirmPage() {
  const { t } = useTranslation('auth');
  const { token_hash: tokenHash, type, next } = route.useSearch();
  const { data: result } = useSuspenseQuery(authQueries.emailLink({ token_hash: tokenHash, type }));
  const { session, roles } = useAuth();

  if (result.status === 'verified') {
    if (session) {
      return <Navigate to={emailLinkTarget(type, next, roles)} replace />;
    }
    if (!result.hasSession) {
      return (
        <>
          <AuthPageHeading title={t('confirm.acceptedTitle')} />
          <AuthNotice tone="success">{t('confirm.accepted')}</AuthNotice>
        </>
      );
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
        <ArrowLink to="/password-reset" direction="forward">
          {t('confirm.newResetLink')}
        </ArrowLink>
      ) : (
        <>
          <p className="text-body text-muted-foreground">{t('confirm.signInHint')}</p>
          <ArrowLink to="/login" direction="forward">
            {t('confirm.signIn')}
          </ArrowLink>
        </>
      )}
    </>
  );
}
