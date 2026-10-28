import { getRouteApi } from '@tanstack/react-router';
import { ListingsBoard } from '@/features/listings';
import { HomeHero } from './home-hero';
import { PhysicalSection } from './physical-section';
import { SmartCheckSection } from './smart-check-section';

const routeApi = getRouteApi('/_site/');

export function HomePage() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  return (
    <>
      <HomeHero />
      <SmartCheckSection />
      <PhysicalSection />
      <section id="listings" className="mx-auto max-w-wide px-gutter py-section">
        <ListingsBoard
          transaction={search.transaction ?? 'sale'}
          onTransactionChange={(transaction) => {
            void navigate({
              search: (previous) => ({ ...previous, transaction }),
              replace: true,
              resetScroll: false,
            });
          }}
        />
      </section>
    </>
  );
}
