import { useEffect, useEffectEvent, useRef } from 'react';
import { env } from '@/config/env';
import { useLocale } from '@/i18n/use-locale';
import { logger } from '@/lib/logger';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type TurnstileOptions = {
  sitekey: string;
  language: string;
  theme: 'light';
  size: 'flexible';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  remove: (widgetId: string) => void;
};

function isTurnstileApi(value: unknown): value is TurnstileApi {
  return (
    typeof value === 'object' &&
    value !== null &&
    'render' in value &&
    typeof value.render === 'function' &&
    'remove' in value &&
    typeof value.remove === 'function'
  );
}

function currentTurnstile(): TurnstileApi | undefined {
  const value: unknown = Reflect.get(window, 'turnstile');
  return isTurnstileApi(value) ? value : undefined;
}

let scriptPromise: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.addEventListener('load', () => {
      const turnstile = currentTurnstile();
      if (turnstile) {
        resolve(turnstile);
      } else {
        reject(new Error('Turnstile did not load'));
      }
    });
    script.addEventListener('error', () => {
      scriptPromise = undefined;
      reject(new Error('Turnstile script failed to load'));
    });
    document.head.append(script);
  });
  return scriptPromise;
}

type CaptchaProps = {
  onToken: (token: string | undefined) => void;
};

export function Captcha({ onToken }: CaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const siteKey = env.VITE_TURNSTILE_SITE_KEY;
  const handleToken = useEffectEvent((token: string | undefined) => {
    onToken(token);
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!siteKey || !container) {
      return;
    }
    let widgetId: string | undefined;
    let isActive = true;
    loadTurnstile()
      .then((turnstile) => {
        if (!isActive) return;
        widgetId = turnstile.render(container, {
          sitekey: siteKey,
          language: locale,
          theme: 'light',
          size: 'flexible',
          callback: (token) => {
            handleToken(token);
          },
          'expired-callback': () => {
            handleToken(undefined);
          },
          'error-callback': () => {
            handleToken(undefined);
          },
        });
      })
      .catch((error: unknown) => {
        logger.error(error);
      });
    return () => {
      isActive = false;
      if (widgetId) {
        currentTurnstile()?.remove(widgetId);
      }
    };
  }, [siteKey, locale]);

  if (!siteKey) {
    return null;
  }

  return <div ref={containerRef} className="min-h-16.5" />;
}
