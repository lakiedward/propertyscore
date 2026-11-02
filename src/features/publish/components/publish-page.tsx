import { getRouteApi } from '@tanstack/react-router';
import { useAuth } from '@/features/auth';
import { FIRST_PUBLISH_STEP, type PublishStepKey } from '../publish.steps';
import { AccountPathSection } from './account-path-section';
import { ChecklistSection } from './checklist-section';
import { PublishFaq } from './publish-faq';
import { PublishHero } from './publish-hero';
import { StepsExplorer } from './steps-explorer';
import { TrustTiersSection } from './trust-tiers-section';

const routeApi = getRouteApi('/_site/publish');

export function PublishPage() {
  const { user } = useAuth();
  const isSignedIn = Boolean(user);
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  const handleStepChange = (step: PublishStepKey) => {
    void navigate({
      search: (previous) => ({ ...previous, step }),
      replace: true,
      resetScroll: false,
    });
  };

  return (
    <>
      <PublishHero isSignedIn={isSignedIn} />
      <AccountPathSection isSignedIn={isSignedIn} />
      <StepsExplorer
        activeKey={search.step ?? FIRST_PUBLISH_STEP}
        onStepChange={handleStepChange}
      />
      <ChecklistSection />
      <TrustTiersSection />
      <PublishFaq />
    </>
  );
}
