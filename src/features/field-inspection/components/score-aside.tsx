import { SendIcon, SquareIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { localizedText } from '@/i18n/localized';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Progress, Workspace } from '../field-inspection.types';
import {
  answerOf,
  firstCategoryWith,
  formatInspectionScore,
  isMediaMissing,
  scoreTone,
  type CategoryGroup,
} from '../field-inspection.utils';
import { OwnerConfirmDialog } from './owner-confirm-dialog';

type ScoreAsideProps = {
  workspace: Workspace;
  groups: readonly CategoryGroup[];
  progress: Progress | undefined;
  isProgressLoading: boolean;
  hasProgressError: boolean;
  onRetryProgress: () => void;
  language: string;
};

export function ScoreAside({
  workspace,
  groups,
  progress,
  isProgressLoading,
  hasProgressError,
  onRetryProgress,
  language,
}: ScoreAsideProps) {
  const { t } = useTranslation('fieldInspection');
  const { t: tCommon } = useTranslation('common');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const breakdownId = useId();
  const missingId = useId();
  const { inspection, answers, media } = workspace;
  const isSigned = workspace.consent !== null;
  const answered = progress?.answered ?? 0;
  const total = progress?.total ?? groups.reduce((sum, group) => sum + group.questions.length, 0);
  const unanswered = total - answered;
  const missingMedia = progress?.missing_media ?? 0;
  const isOpen = inspection.status === 'in_progress';
  const canSubmit = isOpen && unanswered === 0 && missingMedia === 0;
  const firstUnanswered = firstCategoryWith(
    groups,
    (question) => !answerOf(answers, question.id)?.answer,
  );
  const firstMissingMedia = firstCategoryWith(groups, (question) =>
    isMediaMissing(question, answerOf(answers, question.id)?.answer, media),
  );
  const missing = [
    unanswered > 0 && firstUnanswered
      ? {
          key: 'answers',
          label: t('aside.unanswered', { count: unanswered }),
          section: firstUnanswered.key,
        }
      : null,
    missingMedia > 0 && firstMissingMedia
      ? {
          key: 'media',
          label: t('aside.missingMedia', { count: missingMedia }),
          section: firstMissingMedia.key,
        }
      : null,
  ].filter((item) => item !== null);

  return (
    <aside aria-label={t('aside.label')} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl bg-surface-inverse p-4.5 text-on-inverse">
        <span className="text-caption font-bold text-on-photo-faint">{t('aside.provisional')}</span>
        {hasProgressError ? (
          <div role="alert" className="flex flex-col items-start gap-2">
            <span className="text-small font-bold">{t('aside.progressError')}</span>
            <Button type="button" variant="inverse" size="sm" onClick={onRetryProgress}>
              {tCommon('actions.retry')}
            </Button>
          </div>
        ) : isProgressLoading ? (
          <div className="flex flex-col gap-2" aria-hidden>
            <Skeleton className="h-10 w-24 bg-on-inverse/20" />
            <Skeleton className="h-1.5 w-full bg-on-inverse/20" />
            <Skeleton className="h-4 w-40 bg-on-inverse/20" />
          </div>
        ) : (
          <>
            <span className="flex items-baseline gap-1">
              <strong className="text-title-lg leading-none font-extrabold tabular-nums">
                {progress?.score === null || progress?.score === undefined
                  ? t('section.noScore')
                  : formatInspectionScore(progress.score)}
              </strong>
              <span className="text-lg font-bold">{t('aside.outOf')}</span>
            </span>
            <div
              role="progressbar"
              aria-label={t('aside.progress')}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={answered}
              className="h-1.5 overflow-hidden rounded-full bg-on-inverse/20"
            >
              <div
                className="h-full rounded-full bg-cta"
                style={{ width: `${String(total === 0 ? 0 : (answered / total) * 100)}%` }}
              />
            </div>
            <span className="text-caption text-on-photo-faint tabular-nums">
              {t('aside.counters', {
                answered,
                total,
                photos: progress?.photos ?? 0,
                videos: progress?.videos ?? 0,
              })}
            </span>
          </>
        )}
      </div>
      <section aria-labelledby={breakdownId} className="flex flex-col">
        <h2 id={breakdownId} className="pb-1.5 text-body-sm font-bold">
          {t('aside.howTitle')}
        </h2>
        <ul className="flex flex-col text-caption">
          {groups.map(({ category }) => {
            const stats = progress?.categories.find((item) => item.category_id === category.id);
            return (
              <li
                key={category.id}
                className="grid min-h-7.5 grid-cols-[minmax(0,1fr)_40px_40px] items-center border-t border-border-subtle"
              >
                <span className="truncate">
                  {localizedText(category.name_ro, category.name_en, language)}
                </span>
                <span className="text-right text-muted-foreground tabular-nums">
                  {t('aside.weight', { weight: category.weight })}
                </span>
                <strong className={cn('text-right tabular-nums', scoreTone(stats?.score))}>
                  {stats?.score === null || stats?.score === undefined
                    ? t('section.noScore')
                    : formatInspectionScore(stats.score)}
                </strong>
              </li>
            );
          })}
        </ul>
        <p className="pt-1.5 text-meta text-muted-foreground">{t('aside.howNote')}</p>
      </section>
      {isSigned && isOpen && missing.length > 0 ? (
        <section
          aria-labelledby={missingId}
          className="flex flex-col gap-1 rounded-lg bg-warning-surface p-3"
        >
          <h2 id={missingId} className="text-small font-bold text-warning">
            {t('aside.missingTitle')}
          </h2>
          <ul className="flex flex-col">
            {missing.map((item) => (
              <li key={item.key}>
                <Link
                  to="/field/inspections/$inspectionId"
                  params={{ inspectionId: inspection.id }}
                  search={{ section: item.section }}
                  className="flex min-h-9 items-center gap-2 rounded-sm text-small font-semibold outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring"
                >
                  <SquareIcon aria-hidden className="size-4 text-warning" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {isOpen || !isSigned ? (
        <>
          <Button
            type="button"
            className="w-full"
            disabled={!canSubmit}
            onClick={() => {
              setIsConfirmOpen(true);
            }}
          >
            <SendIcon aria-hidden />
            {t('aside.submit')}
          </Button>
          {isSigned ? null : (
            <p className="text-center text-caption text-muted-foreground">{t('aside.notSigned')}</p>
          )}
          <OwnerConfirmDialog
            inspectionId={inspection.id}
            ownerName={workspace.consent?.signer_name ?? inspection.access_name}
            isOpen={isConfirmOpen}
            onOpenChange={setIsConfirmOpen}
          />
        </>
      ) : null}
    </aside>
  );
}
