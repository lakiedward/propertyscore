import { useTranslation } from 'react-i18next';
import type { SocialProvider } from '../auth.types';
import { AuthNotice } from './auth-notice';

type SocialUnavailableNoticeProps = {
  provider: SocialProvider;
};

export function SocialUnavailableNotice({ provider }: SocialUnavailableNoticeProps) {
  const { t } = useTranslation('auth');

  return (
    <AuthNotice tone="info">
      {t('social.unavailable', { provider: t(`social.providers.${provider}`) })}
    </AuthNotice>
  );
}
