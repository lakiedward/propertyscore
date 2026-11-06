import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineToast } from '@/components/feedback/inline-toast';
import { EmptyState } from '@/components/layout/empty-state';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { moderationQueries } from '../api/moderation.queries';
import { MODERATION_STATUSES } from '../moderation-status';
import type { ListingDecision, ModerationStatus } from '../moderation.types';
import { QueueRow } from './queue-row';
import { ReviewPanel } from './review-panel';
import { StatusTabs } from './status-tabs';

const route = getRouteApi('/_authenticated/admin/listings');

function isModerationStatus(value: string): value is ModerationStatus {
  return MODERATION_STATUSES.some((status) => status === value);
}

export function ModerationPage() {
  const { t } = useTranslation('moderation');
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { data: counts } = useSuspenseQuery(moderationQueries.counts());
  const { data: queue } = useSuspenseQuery(moderationQueries.queue(search.status));
  const selected = queue.items.find((item) => item.id === search.listing) ?? queue.items[0];
  const emptyKey = search.status === 'pending_approval' ? 'pending' : 'decided';

  const handleDecided = (decision: ListingDecision, title: string) => {
    setToastMessage(t(`toast.${decision}`, { title }));
    void navigate({ search: (previous) => ({ ...previous, listing: undefined }) });
  };

  return (
    <Tabs
      value={search.status}
      onValueChange={(value) => {
        if (isModerationStatus(value)) {
          setToastMessage(null);
          void navigate({ search: { status: value } });
        }
      }}
      className="gap-5"
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-eyebrow leading-copy font-bold tracking-eyebrow text-muted-foreground uppercase">
            {t('head.eyebrow')}
          </p>
          <h1 className="text-h2 leading-heading text-foreground">{t('head.title')}</h1>
          <p className="text-small text-muted-foreground">{t('head.description')}</p>
        </div>
        <StatusTabs counts={counts} />
      </header>
      <TabsContent value={search.status} className="text-base">
        {selected ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
            <nav
              aria-label={t('queue.label')}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <ul className="divide-y divide-border-subtle">
                {queue.items.map((item) => (
                  <li key={item.id}>
                    <QueueRow
                      listing={item}
                      isSelected={item.id === selected.id}
                      onSelect={() => {
                        setToastMessage(null);
                      }}
                    />
                  </li>
                ))}
              </ul>
            </nav>
            <SelectedListing
              listingId={selected.id}
              toastMessage={toastMessage}
              onDecided={handleDecided}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {toastMessage ? <InlineToast tone="success" message={toastMessage} /> : null}
            <EmptyState
              kind="empty"
              title={t(`queue.empty.${emptyKey}.title`)}
              description={t(`queue.empty.${emptyKey}.description`)}
            />
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

type SelectedListingProps = {
  listingId: string;
  toastMessage: string | null;
  onDecided: (decision: ListingDecision, title: string) => void;
};

function SelectedListing({ listingId, toastMessage, onDecided }: SelectedListingProps) {
  const { data: listing } = useSuspenseQuery(moderationQueries.detail(listingId));

  return (
    <ReviewPanel
      key={listing.id}
      listing={listing}
      toastMessage={toastMessage}
      onDecided={onDecided}
    />
  );
}
