import { ArchiveIcon, CircleCheckIcon, PencilIcon } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import { formatDate } from '@/i18n/format';
import { cn } from '@/lib/utils';
import type { ConsentVersion } from '../inspection-form.types';
import { consentVersionLabel } from '../inspection-form.utils';

const SHORT_DATE = { day: 'numeric', month: 'short', year: 'numeric' } as const;

type ConsentVersionListProps = {
  versions: readonly ConsentVersion[];
};

export function ConsentVersionList({ versions }: ConsentVersionListProps) {
  const { t } = useTranslation('inspectionForm');
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-2 rounded-lg border border-card bg-card p-3.5 shadow-card-soft"
    >
      <h2 id={titleId} className="text-body-sm font-bold">
        {t('consent.versions')}
      </h2>
      <ul className="flex flex-col gap-2">
        {versions.map((version) => (
          <li
            key={version.id}
            className={cn(
              'flex flex-col gap-1 rounded-md px-3 py-2.5',
              version.status === 'draft' ? 'bg-surface-selected' : 'bg-background',
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <strong className="tabular-nums">
                {t('consent.versionLabel', { version: consentVersionLabel(version.version) })}
              </strong>
              {version.status === 'draft' ? (
                <StatusPill tone="info" shape="tag" icon={PencilIcon} label={t('status.draft')} />
              ) : version.status === 'published' ? (
                <StatusPill
                  tone="success"
                  shape="tag"
                  icon={CircleCheckIcon}
                  label={t('status.publishedFeminine')}
                />
              ) : (
                <StatusPill
                  tone="neutral"
                  shape="tag"
                  icon={ArchiveIcon}
                  label={t('status.archived')}
                />
              )}
            </span>
            <span className="text-meta text-muted-foreground">
              {version.status === 'draft'
                ? t('consent.draftLine', { date: formatDate(version.updated_at, SHORT_DATE) })
                : version.status === 'published' && version.published_at
                  ? t('consent.publishedLine', {
                      date: formatDate(version.published_at, SHORT_DATE),
                    })
                  : t('consent.archivedLine', {
                      from: version.published_at
                        ? formatDate(version.published_at, SHORT_DATE)
                        : '',
                      to: version.archived_at ? formatDate(version.archived_at, SHORT_DATE) : '',
                    })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
