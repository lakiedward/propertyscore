import { CircleCheckIcon, PencilIcon, UploadIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { StatusPill } from '@/components/feedback/status-pill';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/i18n/format';
import { cn } from '@/lib/utils';
import {
  useCreateFormDraft,
  useDiscardFormDraft,
  usePublishForm,
} from '../api/inspection-form.queries';
import type { FormEditor } from '../inspection-form.types';
import { WEIGHT_TOTAL } from '../inspection-form.utils';

type FormHeaderCardProps = {
  editor: FormEditor;
  weightSum: number;
  hasQuestionWeightIssues: boolean;
};

export function FormHeaderCard({
  editor,
  weightSum,
  hasQuestionWeightIssues,
}: FormHeaderCardProps) {
  const { t } = useTranslation('inspectionForm');
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const createDraft = useCreateFormDraft();
  const discardDraft = useDiscardFormDraft();
  const publish = usePublishForm();
  const { draft, published, publishedCounts } = editor;
  const isBalanced = weightSum === WEIGHT_TOTAL;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-card bg-card px-4 py-3.5 shadow-card-soft">
      <div className="flex min-w-0 flex-[1_1_260px] flex-col">
        <strong className="text-base leading-snug font-extrabold">
          {draft
            ? t('form.titleDraft', { version: draft.version })
            : published
              ? t('form.titlePublished', { version: published.version })
              : t('form.titleEmpty')}
        </strong>
        <span className="text-small text-muted-foreground">
          {published?.published_at && publishedCounts
            ? t('form.publishedLine', {
                version: published.version,
                date: formatDate(published.published_at, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }),
                questions: t('form.questionCount', { count: publishedCounts.questions }),
                categories: t('form.categoryCount', { count: publishedCounts.categories }),
              })
            : t('form.noPublished')}
        </span>
      </div>
      {draft ? (
        <StatusPill tone="info" shape="tag" icon={PencilIcon} label={t('status.draft')} />
      ) : (
        <StatusPill
          tone="success"
          shape="tag"
          icon={CircleCheckIcon}
          label={t('status.published')}
        />
      )}
      <span
        className={cn(
          'text-base font-extrabold tabular-nums',
          isBalanced ? 'text-success' : 'text-warning',
        )}
      >
        {t('form.weights', { sum: weightSum })}
      </span>
      {draft ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => {
              setIsDiscardOpen(true);
            }}
          >
            {t('form.discard')}
          </Button>
          <Button
            type="button"
            size="md"
            disabled={!isBalanced || hasQuestionWeightIssues || publish.isPending}
            aria-busy={publish.isPending}
            onClick={() => {
              publish.mutate(draft.id, {
                onSuccess: () => {
                  toast.success(t('form.publishedToast', { version: draft.version }));
                },
              });
            }}
          >
            <UploadIcon aria-hidden />
            {publish.isPending ? t('form.publishing') : t('form.publish')}
          </Button>
          <ConfirmDialog
            isOpen={isDiscardOpen}
            onOpenChange={setIsDiscardOpen}
            tone="destructive"
            title={t('form.discardTitle', { version: draft.version })}
            description={t('form.discardDescription')}
            confirmLabel={t('form.discardConfirm')}
            pendingLabel={t('form.discarding')}
            isPending={discardDraft.isPending}
            onConfirm={() => {
              discardDraft.mutate(draft.id, {
                onSuccess: () => {
                  setIsDiscardOpen(false);
                },
              });
            }}
          />
        </>
      ) : (
        <Button
          type="button"
          size="md"
          disabled={createDraft.isPending}
          aria-busy={createDraft.isPending}
          onClick={() => {
            createDraft.mutate();
          }}
        >
          <PencilIcon aria-hidden />
          {createDraft.isPending ? t('form.creatingDraft') : t('form.createDraft')}
        </Button>
      )}
    </div>
  );
}
