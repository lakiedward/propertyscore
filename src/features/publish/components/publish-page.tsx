import { useAuth } from '@/features/auth';
import { AccountPathSection } from './account-path-section';
import { ChecklistSection } from './checklist-section';
import { PublishFaq } from './publish-faq';
import { PublishHero } from './publish-hero';
import { StepsExplorer } from './steps-explorer';
import { TrustTiersSection } from './trust-tiers-section';

export function PublishPage() {
  const { user } = useAuth();
  const isSignedIn = Boolean(user);

  return (
    <>
      <PublishHero isSignedIn={isSignedIn} />
      <AccountPathSection isSignedIn={isSignedIn} />
      <StepsExplorer />
      <ChecklistSection />
      <TrustTiersSection />
      <PublishFaq />
    </>
  );
}
