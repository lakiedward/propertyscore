import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineToast } from '@/components/feedback/inline-toast';
import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useStoredFlag } from '@/hooks/use-stored-flag';
import { cn } from '@/lib/utils';
import { moderationQueries } from '../api/moderation.queries';
import { MODERATION_STATUSES } from '../moderation-status';
import type { ListingDecision, ModerationStatus } from '../moderation.types';
import { QueueRow } from './queue-row';
import { ReviewPanel } from './review-panel';
import { StatusTabs } from './status-tabs';

const route = getRouteApi('/_authenticated/admin/listings');

export const QUEUE_HIDDEN_STORAGE_KEY = 'ps-moderation-queue-hidden';

function isModerationStatus(value: string): value is ModerationStatus {
  return MODERATION_STATUSES.some((status) => status === value);
}

export function ModerationPage() {
  const { t } = useTranslation('moderation');
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const queuePanel = useStoredFlag(QUEUE_HIDDEN_STORAGE_KEY);
  const isQueueHidden = queuePanel.isOn;
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
          <div
            className={cn(
              'grid grid-cols-1 gap-5 lg:items-start',
              !isQueueHidden &&
                'lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)] 2xl:grid-cols-[440px_minmax(0,1fr)]',
            )}
          >
            {isQueueHidden ? null : (
              <nav
                aria-label={t('queue.label')}
                className="overflow-hidden rounded-lg border border-border bg-card lg:sticky lg:top-[calc(var(--header-height)+16px)]"
              >
                <div className="flex items-center justify-between gap-2 border-b border-border-subtle py-2 pr-2 pl-4">
                  <p className="text-small font-bold text-foreground">
                    {t('queue.heading', { count: queue.total })}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('queue.hide')}
                    title={t('queue.hide')}
                    onClick={queuePanel.toggle}
                  >
                    <PanelLeftCloseIcon aria-hidden />
                  </Button>
                </div>
                <ul className="max-h-[70svh] divide-y divide-border-subtle overflow-y-auto">
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
            )}
            <div className="flex min-w-0 flex-col gap-4">
              {isQueueHidden ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={queuePanel.toggle}
                >
                  <PanelLeftOpenIcon aria-hidden />
                  {t('queue.show', { count: queue.total })}
                </Button>
              ) : null}
              <SelectedListing
                listingId={selected.id}
                toastMessage={toastMessage}
                onDecided={handleDecided}
              />
            </div>
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
