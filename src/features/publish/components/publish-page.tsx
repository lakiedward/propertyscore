import { useAuth } from '@/features/auth';
import { AccountPathSection } from './account-path-section';
import { PublishHero } from './publish-hero';
import { StepsExplorer } from './steps-explorer';

export function PublishPage() {
  const { user } = useAuth();
  const isSignedIn = Boolean(user);

  return (
    <>
      <PublishHero isSignedIn={isSignedIn} />
      <AccountPathSection isSignedIn={isSignedIn} />
      <StepsExplorer />
    </>
  );
}
