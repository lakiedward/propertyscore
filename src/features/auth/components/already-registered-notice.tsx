import { Trans, useTranslation } from 'react-i18next';
import { TextLink } from '@/components/navigation/text-link';
import { AuthNotice } from './auth-notice';

type AlreadyRegisteredNoticeProps = {
  redirect: string | undefined;
};

export function AlreadyRegisteredNotice({ redirect }: AlreadyRegisteredNoticeProps) {
  const { t } = useTranslation('auth');

  return (
    <AuthNotice tone="warning" title={t('signUp.alreadyRegistered.title')}>
      <Trans
        t={t}
        i18nKey="signUp.alreadyRegistered.text"
        components={{
          signIn: <TextLink to="/login" search={{ redirect }} size="inherit" className="px-0.5" />,
          reset: <TextLink to="/password-reset" size="inherit" className="px-0.5" />,
        }}
      />
    </AuthNotice>
  );
}
