import type { Enums } from '@/lib/supabase/database.types';

export const SOCIAL_PROVIDERS = ['google'] as const;

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export type SocialNotice = {
  kind: 'unavailable' | 'failed';
  provider: SocialProvider;
};

export type AppRole = Enums<'app_role'>;

export const EMAIL_LINK_TYPES = ['signup', 'email', 'recovery', 'email_change'] as const;

export type EmailLinkType = (typeof EMAIL_LINK_TYPES)[number];

export type SignInMethod = {
  method: string;
  signedInAt: number;
};
