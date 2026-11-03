import { MailIcon } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useResendConfirmation } from '../api/auth.queries';
import { AuthNotice } from './auth-notice';
import { AuthStatusCard } from './auth-status-card';
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
    <AuthStatusCard
      eyebrow={t('confirmEmail.eyebrow')}
      title={t('confirmEmail.title')}
      actions={
        <Button
          type="button"
          variant="ghost"
          onClick={onUseOtherEmail}
          className="h-11 border-[1.5px] px-4.5 text-body font-bold"
        >
          {t('confirmEmail.otherEmail')}
        </Button>
      }
    >
      <MailIcon aria-hidden className="size-8 text-brand" />
      <p className="text-body text-muted-foreground">
        <Trans
          t={t}
          i18nKey="confirmEmail.text"
          values={{ email }}
          components={{ strong: <strong className="font-bold break-all text-foreground" /> }}
        />
      </p>
      {isRepeat ? <AuthNotice tone="info">{t('confirmEmail.repeat')}</AuthNotice> : null}
      <p className="text-body-sm text-muted-foreground">{t('confirmEmail.notFound')}</p>
      <ResendLink
        isCoolingDownAtStart
        onResend={async (captchaToken) => {
          await resendConfirmation.mutateAsync({ email, redirect, captchaToken });
        }}
      />
    </AuthStatusCard>
  );
}
