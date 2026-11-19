import type { User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { profileQueries } from '../api/profile.queries';

export function useAccountIdentity(user: User) {
  const { data: profile } = useQuery(profileQueries.detail(user.id));
  const email = user.email ?? '';
  return { name: profile?.full_name ?? email, email };
}
