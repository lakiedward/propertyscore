import { Trans, useTranslation } from 'react-i18next';
import { useResendConfirmation } from '../api/auth.queries';
import { AuthNotice } from './auth-notice';
import { AuthStatusCard } from './auth-status-card';
import { OtherEmailPrompt } from './other-email-prompt';
import { ResendLink } from './resend-link';

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
    <>
      <AuthStatusCard
        eyebrow={isRepeat ? t('confirmEmail.repeatEyebrow') : t('confirmEmail.eyebrow')}
        title={t('confirmEmail.title')}
      >
        <p className="text-body leading-copy text-muted-foreground">
          <Trans
            t={t}
            i18nKey={isRepeat ? 'confirmEmail.repeatText' : 'confirmEmail.text'}
            values={{ email }}
            components={{ strong: <strong className="font-bold wrap-anywhere text-foreground" /> }}
          />
        </p>
        {isRepeat ? (
          <AuthNotice tone="info" title={t('confirmEmail.repeatTitle')}>
            {t('confirmEmail.repeat')}
          </AuthNotice>
        ) : null}
        <AuthNotice tone="info">{t('confirmEmail.notFound')}</AuthNotice>
        <ResendLink
          isCoolingDownAtStart
          onResend={async (captchaToken) => {
            await resendConfirmation.mutateAsync({ email, redirect, captchaToken });
          }}
        />
      </AuthStatusCard>
      <OtherEmailPrompt onUseOtherEmail={onUseOtherEmail} />
    </>
  );
}
