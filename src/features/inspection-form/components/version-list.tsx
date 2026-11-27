import { EllipsisIcon, EyeIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/i18n/format';
import { cn } from '@/lib/utils';
import type { VersionItem } from '../inspection-form.types';
import type { VersionRequest } from '../hooks/use-version-history';
import { VersionStatusPill } from './version-status-pill';

const SHORT_DATE = { day: 'numeric', month: 'short', year: 'numeric' } as const;

type VersionListProps = {
  items: readonly VersionItem[];
  shownId: string | null;
  onView: (id: string) => void;
  onRequest: (request: VersionRequest) => void;
};

export function VersionList({ items, shownId, onView, onRequest }: VersionListProps) {
  const { t } = useTranslation('inspectionForm');
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-2 rounded-lg border border-card bg-card p-3.5 shadow-card-soft"
    >
      <h2 id={titleId} className="text-body-sm font-bold">
        {t('versions.title')}
      </h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <VersionRow
            key={item.id}
            item={item}
            isShown={item.id === shownId}
            onView={onView}
            onRequest={onRequest}
          />
        ))}
      </ul>
    </section>
  );
}

type VersionRowProps = {
  item: VersionItem;
  isShown: boolean;
  onView: (id: string) => void;
  onRequest: (request: VersionRequest) => void;
};

function VersionRow({ item, isShown, onView, onRequest }: VersionRowProps) {
  const { t } = useTranslation('inspectionForm');
  const dateLine = useDateLine(item);
  const deleteBlock =
    item.status === 'published'
      ? t('versions.cannotDeletePublished')
      : item.inspectionCount > 0
        ? t('versions.cannotDeleteInUse')
        : null;

  return (
    <li
      className={cn(
        'relative rounded-md border-(length:--border-width-control) transition-colors',
        isShown
          ? 'border-primary bg-surface-selected'
          : 'border-transparent bg-background hover:border-border-strong',
      )}
    >
      <button
        type="button"
        aria-current={isShown ? 'true' : undefined}
        onClick={() => {
          onView(item.id);
        }}
        className={cn(
          'flex w-full min-w-0 flex-col gap-1 rounded-md py-3 pl-3.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring',
          item.status === 'draft' ? 'pr-3.5' : 'pr-11',
        )}
      >
        <span className="flex min-h-7 flex-wrap items-center gap-x-2.5 gap-y-1">
          <strong className="text-base font-extrabold tabular-nums">{item.label}</strong>
          <VersionStatusPill status={item.status} />
        </span>
        <span className="text-meta text-muted-foreground">{dateLine}</span>
        {item.status === 'draft' ? null : (
          <span className="text-meta text-muted-foreground">
            {item.inspectionCount > 0
              ? t('versions.usedIn', { count: item.inspectionCount })
              : t('versions.unused')}
          </span>
        )}
      </button>
      {item.status === 'draft' ? null : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-2 right-2 text-muted-foreground"
              aria-label={t('versions.actions', { version: item.label })}
            >
              <EllipsisIcon aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem
              onSelect={() => {
                onView(item.id);
              }}
            >
              <EyeIcon aria-hidden />
              {t('versions.view')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                onRequest({ kind: 'restore', item });
              }}
            >
              <RotateCcwIcon aria-hidden />
              {t('versions.restore')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={deleteBlock !== null}
              onSelect={() => {
                onRequest({ kind: 'delete', item });
              }}
              className="items-start"
            >
              <Trash2Icon aria-hidden className="mt-0.5" />
              <span className="flex flex-col">
                {t('versions.delete')}
                {deleteBlock ? (
                  <span className="text-meta text-muted-foreground">{deleteBlock}</span>
                ) : null}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}

function useDateLine(item: VersionItem): string {
  const { t } = useTranslation('inspectionForm');
  if (item.status === 'draft') {
    return t('versions.draftLine', { date: formatDate(item.updatedAt, SHORT_DATE) });
  }
  if (item.status === 'published') {
    return item.publishedAt
      ? t('versions.publishedLine', { date: formatDate(item.publishedAt, SHORT_DATE) })
      : '';
  }
  return t('versions.archivedLine', {
    from: item.publishedAt ? formatDate(item.publishedAt, SHORT_DATE) : '',
    to: item.archivedAt ? formatDate(item.archivedAt, SHORT_DATE) : '',
  });
}
