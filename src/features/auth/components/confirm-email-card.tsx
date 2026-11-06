import { useTranslation } from 'react-i18next';
import { useResendConfirmation } from '../api/auth.queries';
import { AuthNotice } from './auth-notice';
import { CheckInboxCard } from './check-inbox-card';

type ConfirmEmailCardProps = {
  email: string;
  isRepeat: boolean;
  redirect: string | undefined;
  onUseOtherEmail: () => void;
};

export function ConfirmEmailCard({
  email,
  isRepeat,
  redirect,
  onUseOtherEmail,
}: ConfirmEmailCardProps) {
  const { t } = useTranslation('auth');
  const resendConfirmation = useResendConfirmation();

  return (
    <CheckInboxCard
      eyebrow={isRepeat ? t('confirmEmail.repeatEyebrow') : t('confirmEmail.eyebrow')}
      title={t('confirmEmail.title')}
      textKey={isRepeat ? 'confirmEmail.repeatText' : 'confirmEmail.text'}
      email={email}
      onResend={async (captchaToken) => {
        await resendConfirmation.mutateAsync({ email, redirect, captchaToken });
      }}
      onUseOtherEmail={onUseOtherEmail}
    >
      {isRepeat ? (
        <AuthNotice tone="info" title={t('confirmEmail.repeatTitle')}>
          {t('confirmEmail.repeat')}
        </AuthNotice>
      ) : null}
      <AuthNotice tone="info">{t('confirmEmail.notFound')}</AuthNotice>
    </CheckInboxCard>
  );
}
