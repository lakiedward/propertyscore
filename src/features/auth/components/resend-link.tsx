import { MailIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useErrorMessage } from '@/i18n/error-message';
import { useCaptcha } from '../hooks/use-captcha';
import { useCooldown } from '../hooks/use-cooldown';
import { AuthNotice } from './auth-notice';
import { Captcha } from './captcha';

const RESEND_COOLDOWN_SECONDS = 60;

type ResendState = { status: 'idle' | 'pending' | 'sent' } | { status: 'error'; error: unknown };

type ResendLinkProps = {
  onResend: (captchaToken: string | undefined) => Promise<void>;
  isCoolingDownAtStart?: boolean;
  secondaryAction?: ReactNode;
};

export function ResendLink({
  onResend,
  isCoolingDownAtStart = false,
  secondaryAction,
}: ResendLinkProps) {
  const { t } = useTranslation('auth');
  const errorMessage = useErrorMessage();
  const captcha = useCaptcha();
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS, isCoolingDownAtStart);
  const [state, setState] = useState<ResendState>({ status: 'idle' });

  const handleResend = async () => {
    if (!captcha.isReady) {
      setState({ status: 'error', error: undefined });
      return;
    }
    setState({ status: 'pending' });
    try {
      await onResend(captcha.token);
      setState({ status: 'sent' });
      cooldown.start();
    } catch (error) {
      setState({ status: 'error', error });
    } finally {
      captcha.reset();
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {state.status === 'sent' ? <AuthNotice tone="success">{t('resend.sent')}</AuthNotice> : null}
      {state.status === 'error' ? (
        <AuthNotice tone="error">
          {state.error === undefined ? t('captcha.required') : errorMessage(state.error)}
        </AuthNotice>
      ) : null}
      {cooldown.isActive ? null : <Captcha key={captcha.widgetKey} onToken={captcha.setToken} />}
      <div className="flex flex-wrap gap-2.5">
        <Button
          type="button"
          variant="outline"
          disabled={cooldown.isActive || state.status === 'pending'}
          onClick={() => void handleResend()}
          className="h-11 border-[1.5px] px-4.5 text-body font-bold tabular-nums"
        >
          <MailIcon aria-hidden />
          {cooldown.isActive
            ? t('resend.wait', { count: cooldown.remaining })
            : state.status === 'pending'
              ? t('resend.pending')
              : t('resend.action')}
        </Button>
        {secondaryAction}
      </div>
    </div>
  );
}
