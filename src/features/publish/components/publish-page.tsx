import { useAuth } from '@/features/auth';
import { AccountPathSection } from './account-path-section';
import { PublishHero } from './publish-hero';

export function PublishPage() {
  const { user } = useAuth();
  const isSignedIn = Boolean(user);

  return (
    <>
      <PublishHero isSignedIn={isSignedIn} />
      <AccountPathSection isSignedIn={isSignedIn} />
    </>
  );
}
