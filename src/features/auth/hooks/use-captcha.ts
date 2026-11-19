import { useState } from 'react';
import { env } from '@/config/env';

export const CAPTCHA_SITE_KEY = env.VITE_TURNSTILE_SITE_KEY;

type CaptchaState = {
  token: string | undefined;
  widgetKey: number;
  isMissing: boolean;
};

export function useCaptcha() {
  const [state, setState] = useState<CaptchaState>({
    token: undefined,
    widgetKey: 0,
    isMissing: false,
  });

  return {
    isMissing: state.isMissing,
    widgetKey: state.widgetKey,
    setToken: (token: string | undefined) => {
      setState((current) => ({ ...current, token }));
    },
    consume: (): { token: string | undefined } | undefined => {
      if (CAPTCHA_SITE_KEY && state.token === undefined) {
        setState((current) => ({ ...current, isMissing: true }));
        return undefined;
      }
      setState((current) => ({
        token: undefined,
        widgetKey: current.widgetKey + 1,
        isMissing: false,
      }));
      return { token: state.token };
    },
  };
}

export type CaptchaControl = ReturnType<typeof useCaptcha>;
