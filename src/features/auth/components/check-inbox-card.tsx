import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { AuthStatusCard } from './auth-status-card';
import { OtherEmailPrompt } from './other-email-prompt';
import { ResendLink } from './resend-link';

type CheckInboxCardProps = {
  eyebrow: string;
  title: string;
  textKey: 'confirmEmail.text' | 'confirmEmail.repeatText' | 'passwordReset.sent.text';
  email: string;
  children: ReactNode;
  onResend: (captchaToken: string | undefined) => Promise<void>;
  onUseOtherEmail: () => void;
};

export function CheckInboxCard({
  eyebrow,
  title,
  textKey,
  email,
  children,
  onResend,
  onUseOtherEmail,
}: CheckInboxCardProps) {
  const { t } = useTranslation('auth');

  return (
    <>
      <AuthStatusCard eyebrow={eyebrow} title={title}>
        <p className="text-body leading-copy text-muted-foreground">
          <Trans
            t={t}
            i18nKey={textKey}
            values={{ email }}
            components={{ strong: <strong className="font-bold wrap-anywhere text-foreground" /> }}
          />
        </p>
        {children}
        <ResendLink isCoolingDownAtStart onResend={onResend} />
      </AuthStatusCard>
      <OtherEmailPrompt onUseOtherEmail={onUseOtherEmail} />
    </>
  );
}
