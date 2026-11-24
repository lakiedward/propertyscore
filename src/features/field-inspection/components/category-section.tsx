import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/i18n/format';
import type { CategoryProgress, Workspace } from '../field-inspection.types';
import { answerOf, mediaOf, type CategoryGroup } from '../field-inspection.utils';
import { QuestionCard } from './question-card';

type CategorySectionProps = {
  workspace: Workspace;
  group: CategoryGroup;
  previous: CategoryGroup | undefined;
  next: CategoryGroup | undefined;
  stats: CategoryProgress | undefined;
  fileUrls: Readonly<Record<string, string>>;
  language: string;
};

export function CategorySection({
  workspace,
  group,
  previous,
  next,
  stats,
  fileUrls,
  language,
}: CategorySectionProps) {
  const { t } = useTranslation('fieldInspection');
  const { inspection } = workspace;
  const isEditable = inspection.status === 'in_progress';
  const nameOf = (item: CategoryGroup) =>
    language === 'en' && item.category.name_en ? item.category.name_en : item.category.name_ro;

  return (
    <section
      aria-labelledby={`section-${group.category.id}`}
      className="flex min-w-0 flex-col gap-3.5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id={`section-${group.category.id}`}
          className="text-title-xs leading-tight font-extrabold"
        >
          {nameOf(group)}
        </h2>
        <span className="text-small text-muted-foreground tabular-nums">
          {t('section.weightLine', {
            weight: group.category.weight,
            done: stats?.answered ?? 0,
            total: group.questions.length,
            score:
              stats?.score === null || stats?.score === undefined
                ? t('section.noScore')
                : formatNumber(stats.score, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
          })}
        </span>
      </div>
      <ol className="flex flex-col gap-3.5">
        {group.questions.map((question) => (
          <li key={question.id}>
            <QuestionCard
              inspectionId={inspection.id}
              question={question}
              answer={answerOf(workspace.answers, question.id)}
              media={mediaOf(workspace.media, question.id)}
              fileUrls={fileUrls}
              language={language}
              isEditable={isEditable}
            />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {previous ? (
          <Button asChild variant="ghost">
            <Link
              to="/field/inspections/$inspectionId"
              params={{ inspectionId: inspection.id }}
              search={{ section: previous.category.key }}
            >
              <ArrowLeftIcon aria-hidden />
              {t('section.back')}
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {next ? (
          <Button asChild>
            <Link
              to="/field/inspections/$inspectionId"
              params={{ inspectionId: inspection.id }}
              search={{ section: next.category.key }}
            >
              {t('section.next', { name: nameOf(next) })}
              <ArrowRightIcon aria-hidden />
            </Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
