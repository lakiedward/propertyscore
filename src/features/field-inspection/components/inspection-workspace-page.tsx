import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { formatDate, formatNumber } from '@/i18n/format';
import { fieldInspectionQueries } from '../api/field-inspection.queries';
import { CONSENT_SECTION, type Workspace } from '../field-inspection.types';
import { groupQuestionsByCategory } from '@/lib/question-numbering';
import { answerOf, firstCategoryWith } from '../field-inspection.utils';
import { CategorySection } from './category-section';
import { ConsentStep } from './consent-step';
import { ScoreAside } from './score-aside';
import { SectionNav } from './section-nav';
import { SubmittedState } from './submitted-state';

const route = getRouteApi('/_authenticated/field/inspections/$inspectionId');

export function InspectionWorkspacePage() {
  const { t, i18n } = useTranslation('fieldInspection');
  const { inspectionId } = route.useParams();
  const search = route.useSearch();
  const { data: state } = useSuspenseQuery(fieldInspectionQueries.workspace(inspectionId));
  const { data: content } = useSuspenseQuery(
    fieldInspectionQueries.content(state.formVersionId, state.consentVersionId),
  );
  const workspace: Workspace = { ...state, ...content };
  const { inspection, consent } = workspace;
  const isSigned = consent !== null;
  const progress = useQuery({
    ...fieldInspectionQueries.progress(inspectionId),
    enabled: isSigned,
  });
  const language = i18n.language;
  const groups = groupQuestionsByCategory(workspace.categories, workspace.questions);
  const defaultSection =
    firstCategoryWith(groups, (question) => !answerOf(workspace.answers, question.id)?.answer)
      ?.key ?? groups[0]?.category.key;
  const section = !isSigned ? CONSENT_SECTION : (search.section ?? defaultSection);
  const groupIndex = groups.findIndex((group) => group.category.key === section);
  const group = groups[groupIndex];
  const isSubmitted = inspection.status === 'completed' || inspection.status === 'book_ready';
  const facts = [
    t('workspace.area', { area: formatNumber(inspection.area_m2) }),
    inspection.floor !== null && inspection.building_floors !== null
      ? t('workspace.floor', { floor: inspection.floor, floors: inspection.building_floors })
      : null,
    inspection.year_built === null ? null : t('workspace.year', { year: inspection.year_built }),
    t('workspace.contact', { name: inspection.access_name, phone: inspection.access_phone }),
  ].filter((fact): fact is string => fact !== null);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <span className="text-eyebrow font-bold text-muted-foreground uppercase">
          {inspection.address_text}
        </span>
        <h2 className="text-title-sm leading-tight font-extrabold">
          {t('workspace.title', { number: inspection.number })}
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-small text-muted-foreground">
          <span>{facts.join(' · ')}</span>
          {consent ? (
            <span className="font-extrabold text-success">
              {t('workspace.consentSigned', {
                time: formatDate(consent.signed_at, { hour: '2-digit', minute: '2-digit' }),
              })}
            </span>
          ) : null}
        </div>
      </header>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        <div className="sticky top-0 z-10 -mx-4 border-b border-border-subtle bg-background px-4 py-2 md:-mx-8 md:px-8 xl:static xl:mx-0 xl:border-0 xl:bg-transparent xl:p-0">
          <SectionNav
            workspace={workspace}
            groups={groups}
            progress={progress.data}
            current={isSubmitted ? undefined : section}
            language={language}
          />
        </div>
        <div className="@container min-w-0">
          {isSubmitted ? (
            <SubmittedState submittedAt={inspection.submitted_at} score={inspection.score} />
          ) : section === CONSENT_SECTION || !group ? (
            <ConsentStep workspace={workspace} firstSection={defaultSection} />
          ) : (
            <CategorySection
              key={group.category.id}
              workspace={workspace}
              group={group}
              previous={groups[groupIndex - 1]}
              next={groups[groupIndex + 1]}
              stats={progress.data?.categories.find(
                (item) => item.category_id === group.category.id,
              )}
              language={language}
            />
          )}
        </div>
        <ScoreAside
          workspace={workspace}
          groups={groups}
          progress={progress.data}
          isProgressLoading={progress.isLoading}
          hasProgressError={isSigned && progress.isError && !progress.data}
          onRetryProgress={() => {
            void progress.refetch();
          }}
          language={language}
        />
      </div>
    </div>
  );
}
