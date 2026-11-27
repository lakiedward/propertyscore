import { Link } from '@tanstack/react-router';
import { cva } from 'class-variance-authority';
import { PenLineIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { localizedText } from '@/i18n/localized';
import { CategoryIcon } from '@/components/inspection/category-icon';
import { formatDate } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { CONSENT_SECTION, type Progress, type Workspace } from '../field-inspection.types';
import { formatInspectionScore, scoreTone, type CategoryGroup } from '../field-inspection.utils';

const itemClass =
  'flex min-h-12 shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring xl:shrink';

const tileVariants = cva('grid size-8 shrink-0 place-items-center rounded-thumb', {
  variants: {
    state: {
      active: 'bg-primary text-primary-foreground',
      complete: 'bg-success-surface text-success',
      pending: 'bg-background text-brand',
    },
  },
});

function tile(isActive: boolean, isComplete: boolean) {
  if (isActive) {
    return tileVariants({ state: 'active' });
  }
  return tileVariants({ state: isComplete ? 'complete' : 'pending' });
}

type SectionNavProps = {
  workspace: Workspace;
  groups: readonly CategoryGroup[];
  progress: Progress | undefined;
  current: string | undefined;
  language: string;
};

export function SectionNav({ workspace, groups, progress, current, language }: SectionNavProps) {
  const { t } = useTranslation('fieldInspection');
  const { inspection, consent } = workspace;
  const isSigned = consent !== null;
  return (
    <nav
      aria-label={t('nav.label')}
      className="-mx-1 scrollbar-none flex gap-1 overflow-x-auto px-1 xl:mx-0 xl:flex-col xl:overflow-visible xl:px-0"
    >
      <Link
        to="/field/inspections/$inspectionId"
        params={{ inspectionId: inspection.id }}
        search={{ section: CONSENT_SECTION }}
        aria-current={current === CONSENT_SECTION ? 'true' : undefined}
        className={cn(itemClass, current === CONSENT_SECTION && 'bg-surface-alt')}
      >
        <span className={tile(current === CONSENT_SECTION, isSigned)}>
          <PenLineIcon aria-hidden className="size-4.5" />
        </span>
        <span className="flex min-w-0 flex-col">
          <strong className="truncate text-small">{t('nav.consent')}</strong>
          <span className="text-meta text-muted-foreground">
            {consent
              ? t('nav.signed', {
                  time: formatDate(consent.signed_at, { hour: '2-digit', minute: '2-digit' }),
                })
              : t('nav.toSign')}
          </span>
        </span>
      </Link>
      {groups.map(({ category, questions }) => {
        const stats = progress?.categories.find((item) => item.category_id === category.id);
        const done = stats?.answered ?? 0;
        const isActive = current === category.key;
        const isComplete = questions.length > 0 && done === questions.length;
        const name = localizedText(category.name_ro, category.name_en, language);
        const content = (
          <>
            <span className={tile(isActive, isComplete)}>
              <CategoryIcon icon={category.icon} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <strong className="truncate text-small">{name}</strong>
              <span className="text-meta whitespace-nowrap text-muted-foreground">
                {t('nav.categorySub', {
                  done,
                  total: questions.length,
                  weight: category.weight,
                })}
              </span>
            </span>
            {stats?.score !== null && stats?.score !== undefined ? (
              <strong className={cn('text-small tabular-nums', scoreTone(stats.score))}>
                {formatInspectionScore(stats.score)}
              </strong>
            ) : null}
          </>
        );
        if (!isSigned) {
          return (
            <span
              key={category.id}
              aria-disabled
              title={t('nav.locked')}
              className={cn(itemClass, 'cursor-not-allowed opacity-45')}
            >
              {content}
            </span>
          );
        }
        return (
          <Link
            key={category.id}
            to="/field/inspections/$inspectionId"
            params={{ inspectionId: inspection.id }}
            search={{ section: category.key }}
            aria-current={isActive ? 'true' : undefined}
            className={cn(itemClass, isActive && 'bg-surface-alt')}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
