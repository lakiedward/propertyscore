import { useTranslation } from 'react-i18next';
import type { SocialSignInNotice as Notice } from '../hooks/use-social-sign-in';
import { AuthNotice } from './auth-notice';

type SocialSignInNoticeProps = {
  notice: Notice;
};

export function SocialSignInNotice({ notice }: SocialSignInNoticeProps) {
  const { t } = useTranslation('auth');
  const provider = t(`social.providers.${notice.provider}`);

  return notice.kind === 'unavailable' ? (
    <AuthNotice tone="info">{t('social.unavailable', { provider })}</AuthNotice>
  ) : (
    <AuthNotice tone="error">{t('social.failed', { provider })}</AuthNotice>
  );
}
