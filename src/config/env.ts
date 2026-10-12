import { z } from 'zod';

const envSchema = z.object({
  VITE_APP_ENV: z.enum(['local', 'staging', 'production']),
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_SENTRY_DSN: z
    .string()
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
});

export const env = {
  ...envSchema.parse(import.meta.env),
  isDevBuild: import.meta.env.DEV,
};
