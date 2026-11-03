import { useState } from 'react';
import { env } from '@/config/env';

const isCaptchaEnabled = Boolean(env.VITE_TURNSTILE_SITE_KEY);

export function useCaptcha() {
  const [state, setState] = useState<{ token: string | undefined; widgetKey: number }>({
    token: undefined,
    widgetKey: 0,
  });

  return {
    token: state.token,
    isReady: !isCaptchaEnabled || state.token !== undefined,
    widgetKey: state.widgetKey,
    setToken: (token: string | undefined) => {
      setState((current) => ({ ...current, token }));
    },
    reset: () => {
      setState((current) => ({ token: undefined, widgetKey: current.widgetKey + 1 }));
    },
  };
}
