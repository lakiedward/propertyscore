import { cva } from 'class-variance-authority';
import {
  CameraIcon,
  CheckIcon,
  CircleSlashIcon,
  MinusIcon,
  NotebookPenIcon,
  TriangleAlertIcon,
  VideoIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAddMedia, useRemoveMedia, useSaveAnswer } from '../api/field-inspection.queries';
import { NOTE_MAX } from '../field-inspection.schemas';
import {
  INSPECTION_ANSWERS,
  VIDEO_MAX_BYTES,
  VIDEO_TYPES,
  type InspectionAnswer,
  type InspectionMediaKind,
  type WorkspaceAnswer,
  type WorkspaceMedia,
} from '../field-inspection.types';
import { isMediaMissing, type NumberedQuestion } from '../field-inspection.utils';

const ANSWER_ICONS: Record<InspectionAnswer, LucideIcon> = {
  good: CheckIcon,
  acceptable: MinusIcon,
  problem: TriangleAlertIcon,
  not_applicable: CircleSlashIcon,
};

const answerVariants = cva(
  'inline-flex min-h-13 items-center justify-center gap-2 rounded-lg border-[1.5px] px-3 text-body-sm font-extrabold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 @xl:min-h-11 [&_svg]:size-4.5 [&_svg]:shrink-0',
  {
    variants: {
      answer: {
        good: '',
        acceptable: '',
        problem: '',
        not_applicable: '',
      },
      isSelected: {
        true: 'border-2 text-primary-foreground shadow-sm',
        false: 'border-border bg-card text-foreground',
      },
    },
    compoundVariants: [
      { answer: 'good', isSelected: true, className: 'border-answer-good bg-answer-good' },
      { answer: 'acceptable', isSelected: true, className: 'border-answer-ok bg-answer-ok' },
      { answer: 'problem', isSelected: true, className: 'border-answer-problem bg-answer-problem' },
      { answer: 'not_applicable', isSelected: true, className: 'border-answer-na bg-answer-na' },
      { answer: 'good', isSelected: false, className: '[&_svg]:text-answer-good' },
      { answer: 'acceptable', isSelected: false, className: '[&_svg]:text-answer-ok' },
      { answer: 'problem', isSelected: false, className: '[&_svg]:text-answer-problem' },
      { answer: 'not_applicable', isSelected: false, className: '[&_svg]:text-answer-na' },
    ],
  },
);

const numberVariants = cva(
  'grid size-9 shrink-0 place-items-center rounded-full text-small font-extrabold tabular-nums',
  {
    variants: {
      answer: {
        none: 'bg-background text-foreground',
        good: 'bg-answer-good text-primary-foreground',
        acceptable: 'bg-answer-ok text-primary-foreground',
        problem: 'bg-answer-problem text-primary-foreground',
        not_applicable: 'bg-answer-na text-primary-foreground',
      },
    },
  },
);

type QuestionCardProps = {
  inspectionId: string;
  question: NumberedQuestion;
  answer: WorkspaceAnswer | undefined;
  media: readonly WorkspaceMedia[];
  fileUrls: Readonly<Record<string, string>>;
  language: string;
  isEditable: boolean;
};

export function QuestionCard({
  inspectionId,
  question,
  answer,
  media,
  fileUrls,
  language,
  isEditable,
}: QuestionCardProps) {
  const { t } = useTranslation('fieldInspection');
  const baseId = useId();
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const saveAnswer = useSaveAnswer(inspectionId);
  const addMedia = useAddMedia(inspectionId);
  const removeMedia = useRemoveMedia(inspectionId);
  const [note, setNote] = useState(answer?.note ?? '');
  const [isNoteOpen, setIsNoteOpen] = useState((answer?.note ?? '') !== '');
  const current = answer?.answer ?? null;
  const photos = media.filter((item) => item.kind === 'photo');
  const videos = media.filter((item) => item.kind === 'video');
  const isMissing = current !== null && isMediaMissing(question, current, media);
  const text = language === 'en' && question.text_en ? question.text_en : question.text_ro;

  const choose = (value: InspectionAnswer) => {
    if (value === current) {
      return;
    }
    saveAnswer.mutate({ questionId: question.id, answer: value, note });
  };

  const upload = (kind: InspectionMediaKind) => (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    for (const file of files) {
      if (kind === 'video') {
        if (!VIDEO_TYPES.some((type) => type === file.type)) {
          toast.error(t('question.fileTypeInvalid'));
          continue;
        }
        if (file.size > VIDEO_MAX_BYTES) {
          toast.error(t('question.videoTooLarge'));
          continue;
        }
      } else if (!file.type.startsWith('image/')) {
        toast.error(t('question.fileTypeInvalid'));
        continue;
      }
      addMedia.mutate({ questionId: question.id, kind, file });
    }
  };

  const mediaButton = (kind: InspectionMediaKind, count: number) => {
    const isRequired = question.required_media === kind;
    const Icon = kind === 'photo' ? CameraIcon : VideoIcon;
    const isWarning = isRequired && count === 0 && current !== 'not_applicable';
    return (
      <button
        type="button"
        disabled={!isEditable || addMedia.isPending}
        aria-label={t(kind === 'photo' ? 'question.addPhoto' : 'question.addVideo', {
          number: question.number,
        })}
        onClick={() => {
          (kind === 'photo' ? photoInput : videoInput).current?.click();
        }}
        className={cn(
          'inline-flex min-h-10 items-center gap-2 rounded-full border bg-card px-3.5 text-small font-extrabold outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-60',
          isWarning ? 'border-2 border-warning text-warning' : 'border-border text-foreground',
        )}
      >
        <Icon aria-hidden className="size-4" />
        {isRequired
          ? t(kind === 'photo' ? 'question.photoRequired' : 'question.videoRequired')
          : t(kind === 'photo' ? 'question.photo' : 'question.video')}
        {count > 0 ? (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-meta text-primary-foreground tabular-nums">
            {count}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <article
      aria-labelledby={`${baseId}-text`}
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-card-soft',
        isMissing ? 'border-warning' : 'border-card',
      )}
    >
      <div className="flex flex-col gap-3.5 px-4.5 py-4">
        <div className="flex items-start gap-3">
          <span aria-hidden className={numberVariants({ answer: current ?? 'none' })}>
            {question.number}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3
              id={`${baseId}-text`}
              className="text-[17px] leading-snug font-bold"
              lang={language}
            >
              {text}
            </h3>
            <span className="text-caption text-muted-foreground">
              {t(`question.requirement.${question.required_media}`)}
            </span>
          </div>
        </div>
        <div
          role="radiogroup"
          aria-label={t('question.answerGroup', { number: question.number })}
          className="grid grid-cols-2 gap-2 @xl:grid-cols-4"
        >
          {INSPECTION_ANSWERS.map((option) => {
            const Icon = ANSWER_ICONS[option];
            const isSelected = current === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={!isEditable}
                onClick={() => {
                  choose(option);
                }}
                className={answerVariants({ answer: option, isSelected })}
              >
                <Icon aria-hidden />
                {t(`question.answers.${option}`)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-border-subtle bg-background px-4.5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {mediaButton('photo', photos.length)}
          {mediaButton('video', videos.length)}
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            hidden
            onChange={upload('photo')}
          />
          <input
            ref={videoInput}
            type="file"
            accept={VIDEO_TYPES.join(',')}
            capture="environment"
            hidden
            onChange={upload('video')}
          />
          {addMedia.isPending ? (
            <span role="status" className="text-caption text-muted-foreground">
              {t('question.uploading')}
            </span>
          ) : null}
          {isEditable && !isNoteOpen ? (
            <button
              type="button"
              onClick={() => {
                setIsNoteOpen(true);
              }}
              className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-small font-extrabold text-brand outline-none focus-visible:ring-3 focus-visible:ring-ring"
            >
              <NotebookPenIcon aria-hidden className="size-4" />
              {t('question.addNote')}
            </button>
          ) : null}
        </div>
        {media.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {media.map((item, index) => {
              const url = fileUrls[item.path];
              const label =
                item.kind === 'photo'
                  ? t('question.mediaAlt', { index: index + 1, number: question.number })
                  : t('question.videoLabel', { index: index + 1, number: question.number });
              return (
                <li key={item.id} className="relative">
                  {item.kind === 'photo' && url ? (
                    <img
                      src={url}
                      alt={label}
                      className="size-14 rounded-thumb border-2 border-card object-cover"
                    />
                  ) : (
                    <span
                      role="img"
                      aria-label={label}
                      className="grid size-14 place-items-center rounded-thumb border-2 border-card bg-surface-alt text-brand"
                    >
                      <VideoIcon aria-hidden className="size-5" />
                    </span>
                  )}
                  {isEditable ? (
                    <button
                      type="button"
                      aria-label={t('question.removeMedia', {
                        index: index + 1,
                        number: question.number,
                      })}
                      disabled={removeMedia.isPending}
                      onClick={() => {
                        removeMedia.mutate(item.id);
                      }}
                      className="touch-target absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-foreground text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring"
                    >
                      <XIcon aria-hidden className="size-3" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        {isMissing ? (
          <p className="flex items-center gap-2 text-small font-bold text-warning">
            <TriangleAlertIcon aria-hidden className="size-4" />
            {question.required_media === 'video'
              ? t('question.missingVideo')
              : t('question.missingPhoto')}
          </p>
        ) : null}
        {isNoteOpen ? (
          <Field>
            <FieldLabel htmlFor={`${baseId}-note`}>{t('question.noteLabel')}</FieldLabel>
            <Textarea
              id={`${baseId}-note`}
              value={note}
              maxLength={NOTE_MAX}
              disabled={!isEditable}
              placeholder={t('question.notePlaceholder')}
              onChange={(event) => {
                setNote(event.target.value);
              }}
              onBlur={() => {
                if (current !== null && note !== (answer?.note ?? '')) {
                  saveAnswer.mutate({ questionId: question.id, answer: current, note });
                }
              }}
            />
            {current === null && note !== '' ? (
              <span className="text-caption text-muted-foreground">
                {t('question.noteSavedLater')}
              </span>
            ) : null}
          </Field>
        ) : null}
      </div>
    </article>
  );
}
