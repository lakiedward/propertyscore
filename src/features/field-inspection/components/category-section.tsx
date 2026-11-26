import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { localizedText } from '@/i18n/localized';
import { Button } from '@/components/ui/button';
import { fieldInspectionQueries } from '../api/field-inspection.queries';
import type { CategoryProgress, Workspace } from '../field-inspection.types';
import {
  answerOf,
  formatInspectionScore,
  mediaOf,
  type CategoryGroup,
} from '../field-inspection.utils';
import { QuestionCard } from './question-card';

type CategorySectionProps = {
  workspace: Workspace;
  group: CategoryGroup;
  previous: CategoryGroup | undefined;
  next: CategoryGroup | undefined;
  stats: CategoryProgress | undefined;
  language: string;
};

export function CategorySection({
  workspace,
  group,
  previous,
  next,
  stats,
  language,
}: CategorySectionProps) {
  const { t } = useTranslation('fieldInspection');
  const titleId = useId();
  const { inspection } = workspace;
  const questionIds = new Set(group.questions.map((question) => question.id));
  const photoPaths = workspace.media
    .filter((item) => item.kind === 'photo' && questionIds.has(item.question_id))
    .map((item) => item.path);
  const photoUrls = useQuery({
    ...fieldInspectionQueries.photoUrls(photoPaths),
    enabled: photoPaths.length > 0,
  });
  const isEditable = inspection.status === 'in_progress';
  const nameOf = (item: CategoryGroup) =>
    localizedText(item.category.name_ro, item.category.name_en, language);

  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={titleId} className="text-title-xs leading-tight font-extrabold">
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
                : formatInspectionScore(stats.score),
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
              photoUrls={photoUrls.data}
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
