import { DeliverablesSection } from './deliverables-section';
import { HomeFaq } from './home-faq';
import { HomeHero } from './home-hero';
import { ListingsSection } from './listings-section';
import { PartnersSection } from './partners-section';
import { PhysicalSection } from './physical-section';
import { PricingSection } from './pricing-section';
import { SmartCheckSection } from './smart-check-section';

export function HomePage() {
  return (
    <>
      <HomeHero />
      <SmartCheckSection />
      <PhysicalSection />
      <DeliverablesSection />
      <ListingsSection />
      <PartnersSection />
      <PricingSection />
      <HomeFaq />
    </>
  );
}
