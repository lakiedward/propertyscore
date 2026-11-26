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
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { localizedText } from '@/i18n/localized';
import { cn } from '@/lib/utils';
import { useAddMedia, useRemoveMedia, useSaveAnswer } from '../api/field-inspection.queries';
import { photoThumbPath } from '../api/field-inspection.storage';
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
import { useAutosavedNote } from '../hooks/use-autosaved-note';

const ANSWER_ICONS: Record<InspectionAnswer, LucideIcon> = {
  good: CheckIcon,
  acceptable: MinusIcon,
  problem: TriangleAlertIcon,
  not_applicable: CircleSlashIcon,
};

const answerVariants = cva(
  'h-auto min-h-13 rounded-lg border-(length:--border-width-control) border-border bg-card px-3 text-body-sm font-extrabold text-foreground hover:bg-card focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=on]:border-2 data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm @xl:min-h-11 [&_svg]:size-4.5 data-[state=on]:[&_svg]:text-primary-foreground',
  {
    variants: {
      answer: {
        good: 'data-[state=on]:border-answer-good data-[state=on]:bg-answer-good [&_svg]:text-answer-good',
        acceptable:
          'data-[state=on]:border-answer-ok data-[state=on]:bg-answer-ok [&_svg]:text-answer-ok',
        problem:
          'data-[state=on]:border-answer-problem data-[state=on]:bg-answer-problem [&_svg]:text-answer-problem',
        not_applicable:
          'data-[state=on]:border-answer-na data-[state=on]:bg-answer-na [&_svg]:text-answer-na',
      },
    },
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
  photoUrls: Partial<Record<string, string>> | undefined;
  language: string;
  isEditable: boolean;
};

export function QuestionCard({
  inspectionId,
  question,
  answer,
  media,
  photoUrls,
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
  const current = answer?.answer ?? null;
  const { note, setNote } = useAutosavedNote(answer?.note ?? '', (value) => {
    saveAnswer.mutate({ questionId: question.id, answer: null, note: value });
  });
  const [isNoteOpen, setIsNoteOpen] = useState((answer?.note ?? '') !== '');
  const photos = media.filter((item) => item.kind === 'photo');
  const videos = media.filter((item) => item.kind === 'video');
  const isMissing = current !== null && isMediaMissing(question, current, media);
  const text = localizedText(question.text_ro, question.text_en, language);

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
              className="text-title-3xs leading-snug font-bold"
              lang={language}
            >
              {text}
            </h3>
            <span className="text-caption text-muted-foreground">
              {t(`question.requirement.${question.required_media}`)}
            </span>
          </div>
        </div>
        <ToggleGroup
          type="single"
          value={current ?? ''}
          disabled={!isEditable}
          onValueChange={(value) => {
            const option = INSPECTION_ANSWERS.find((item) => item === value);
            if (option) {
              choose(option);
            }
          }}
          aria-label={t('question.answerGroup', { number: question.number })}
          className="grid w-full grid-cols-2 gap-2 @xl:grid-cols-4"
        >
          {INSPECTION_ANSWERS.map((option) => {
            const Icon = ANSWER_ICONS[option];
            return (
              <ToggleGroupItem
                key={option}
                value={option}
                className={answerVariants({ answer: option })}
              >
                <Icon aria-hidden />
                {t(`question.answers.${option}`)}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsNoteOpen(true);
              }}
              className="ml-auto h-10 px-2 font-extrabold"
            >
              <NotebookPenIcon aria-hidden />
              {t('question.addNote')}
            </Button>
          ) : null}
        </div>
        {media.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {numberedMedia(media).map(({ item, index }) => {
              const label =
                item.kind === 'photo'
                  ? t('question.mediaAlt', { index, number: question.number })
                  : t('question.videoLabel', { index, number: question.number });
              const thumbPath = photoThumbPath(item.path);
              return (
                <li key={item.id} className="relative">
                  <MediaThumbnail
                    kind={item.kind}
                    src={(thumbPath ? photoUrls?.[thumbPath] : undefined) ?? photoUrls?.[item.path]}
                    fallbackSrc={photoUrls?.[item.path]}
                    label={label}
                  />
                  {isEditable ? (
                    <button
                      type="button"
                      aria-label={
                        item.kind === 'photo'
                          ? t('question.removePhoto', { index, number: question.number })
                          : t('question.removeVideo', { index, number: question.number })
                      }
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
            />
          </Field>
        ) : null}
      </div>
    </article>
  );
}

function numberedMedia(media: readonly WorkspaceMedia[]) {
  const counts: Partial<Record<InspectionMediaKind, number>> = {};
  return media.map((item) => {
    const index = (counts[item.kind] ?? 0) + 1;
    counts[item.kind] = index;
    return { item, index };
  });
}

type MediaThumbnailProps = {
  kind: InspectionMediaKind;
  src: string | undefined;
  fallbackSrc: string | undefined;
  label: string;
};

function MediaThumbnail({ kind, src, fallbackSrc, label }: MediaThumbnailProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const shownSrc = src !== undefined && src === failedSrc ? fallbackSrc : src;

  if (kind === 'photo' && shownSrc) {
    return (
      <img
        src={shownSrc}
        alt={label}
        width={56}
        height={56}
        loading="lazy"
        decoding="async"
        onError={() => {
          if (shownSrc === src) {
            setFailedSrc(src);
          }
        }}
        className="size-14 rounded-thumb border-2 border-card object-cover"
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={label}
      className="grid size-14 place-items-center rounded-thumb border-2 border-card bg-surface-alt text-brand"
    >
      {kind === 'photo' ? (
        <CameraIcon aria-hidden className="size-5" />
      ) : (
        <VideoIcon aria-hidden className="size-5" />
      )}
    </span>
  );
}
