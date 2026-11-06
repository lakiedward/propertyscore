import { useTranslation } from 'react-i18next';
import type { CaptchaControl } from '../hooks/use-captcha';
import { AuthNotice } from './auth-notice';
import { Captcha } from './captcha';

type CaptchaFieldProps = {
  captcha: CaptchaControl;
};

export function CaptchaField({ captcha }: CaptchaFieldProps) {
  const { t } = useTranslation('auth');

  return (
    <>
      {captcha.isMissing ? <AuthNotice tone="error">{t('captcha.required')}</AuthNotice> : null}
      <Captcha key={captcha.widgetKey} onToken={captcha.setToken} />
    </>
  );
}
