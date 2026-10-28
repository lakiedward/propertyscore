import { getRouteApi } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ListingsBoard } from '@/features/listings';

const routeApi = getRouteApi('/_site/');

export function HomePage() {
  const { t } = useTranslation();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  return (
    <>
      <h1 className="sr-only">{t('app.name')}</h1>
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
