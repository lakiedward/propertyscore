import { z } from 'zod';

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const envSchema = z.object({
  VITE_APP_ENV: z.enum(['local', 'production']),
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_SENTRY_DSN: optionalString,
  VITE_SITE_URL: z
    .literal('')
    .transform(() => undefined)
    .or(z.url().optional()),
  VITE_TURNSTILE_SITE_KEY: optionalString,
});

const parsedEnv = envSchema.parse(import.meta.env);

export const env = {
  ...parsedEnv,
  siteUrl: (parsedEnv.VITE_SITE_URL ?? window.location.origin).replace(/\/+$/, ''),
  isDevBuild: import.meta.env.DEV,
};
