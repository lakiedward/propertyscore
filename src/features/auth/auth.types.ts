import type { Enums } from '@/lib/supabase/database.types';

export const SOCIAL_PROVIDERS = ['google'] as const;

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export type AppRole = Enums<'app_role'>;
