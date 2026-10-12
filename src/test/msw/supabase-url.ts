import { env } from '@/config/env';

export function supabaseUrl(path: string): string {
  return `${env.VITE_SUPABASE_URL}${path}`;
}
