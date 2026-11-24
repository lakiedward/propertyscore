import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  EllipsisIcon,
  FolderInputIcon,
  Trash2Icon,
} from 'lucide-react';
import { useId, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { localizedText } from '@/i18n/localized';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useValidationMessage } from '@/i18n/validation';
import {
  useMoveFormQuestion,
  useRemoveFormQuestion,
  useReorderFormQuestions,
  useUpdateFormQuestion,
} from '../api/inspection-form.queries';
import { questionSchema, type QuestionValues } from '../inspection-form.schemas';
import {
  CONSENT_LANGUAGES,
  REQUIRED_MEDIA,
  type FormCategory,
  type FormQuestion,
  type QuestionPatch,
} from '../inspection-form.types';
import { moveItem } from '../inspection-form.utils';

const [, ENGLISH] = CONSENT_LANGUAGES;

type QuestionEditorCardProps = {
  question: FormQuestion & { number: string };
  siblings: readonly FormQuestion[];
  index: number;
  categories: readonly FormCategory[];
  isEditable: boolean;
};

export function QuestionEditorCard({
  question,
  siblings,
  index,
  categories,
  isEditable,
}: QuestionEditorCardProps) {
  const { t, i18n } = useTranslation('inspectionForm');
  const validationMessage = useValidationMessage();
  const baseId = useId();
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const updateQuestion = useUpdateFormQuestion();
  const reorderQuestions = useReorderFormQuestions();
  const moveQuestion = useMoveFormQuestion();
  const removeQuestion = useRemoveFormQuestion();
  const form = useForm<QuestionValues>({
    resolver: zodResolver(questionSchema),
    values: {
      textRo: question.text_ro,
      textEn: question.text_en,
      requiredMedia: question.required_media,
    },
    resetOptions: { keepDirtyValues: true },
  });
  const [textRo, textEn] = useWatch({ control: form.control, name: ['textRo', 'textEn'] });

  const save = (patch: QuestionPatch) => {
    void form.handleSubmit(() => {
      updateQuestion.mutate({ questionId: question.id, patch });
    })();
  };

  const reorder = (offset: -1 | 1) => {
    reorderQuestions.mutate({
      categoryId: question.category_id,
      questionIds: moveItem(siblings, index, offset).map((item) => item.id),
    });
  };

  return (
    <article
      aria-labelledby={`${baseId}-number`}
      className="flex flex-col gap-2.5 rounded-lg border border-card bg-card px-4.5 py-4 shadow-card-soft"
    >
      <div className="flex items-center justify-between gap-2">
        <strong
          id={`${baseId}-number`}
          className="text-caption font-bold text-muted-foreground tabular-nums"
        >
          {t('form.question.number', { number: question.number })}
        </strong>
        <span className="flex items-center gap-2">
          {textRo.trim() === '' ? (
            <span className="text-meta font-extrabold text-warning">
              {t('form.question.missingRo')}
            </span>
          ) : null}
          {textEn.trim() === '' ? (
            <span className="text-meta font-extrabold text-warning">
              {t('form.question.missingEn')}
            </span>
          ) : null}
          {isEditable ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('form.question.actions', { number: question.number })}
                >
                  <EllipsisIcon aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={index === 0}
                  onSelect={() => {
                    reorder(-1);
                  }}
                >
                  <ArrowUpIcon aria-hidden />
                  {t('form.question.moveUp')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={index === siblings.length - 1}
                  onSelect={() => {
                    reorder(1);
                  }}
                >
                  <ArrowDownIcon aria-hidden />
                  {t('form.question.moveDown')}
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderInputIcon aria-hidden />
                    {t('form.question.moveTo')}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {categories
                      .filter((category) => category.id !== question.category_id)
                      .map((category) => (
                        <DropdownMenuItem
                          key={category.id}
                          onSelect={() => {
                            moveQuestion.mutate({
                              questionId: question.id,
                              categoryId: category.id,
                            });
                          }}
                        >
                          {localizedText(category.name_ro, category.name_en, i18n.language)}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    setIsRemoveOpen(true);
                  }}
                >
                  <Trash2Icon aria-hidden />
                  {t('form.question.remove')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </span>
      </div>
      <Controller
        name="textRo"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${baseId}-ro`}>{t('form.question.textRo')}</FieldLabel>
            <Input
              {...field}
              id={`${baseId}-ro`}
              placeholder={t('form.question.textRoPlaceholder')}
              disabled={!isEditable}
              aria-invalid={fieldState.invalid}
              onBlur={() => {
                field.onBlur();
                if (field.value !== question.text_ro) {
                  save({ text_ro: field.value });
                }
              }}
            />
            <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
          </Field>
        )}
      />
      <Controller
        name="textEn"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${baseId}-en`}>{t('form.question.textEn')}</FieldLabel>
            <Input
              {...field}
              id={`${baseId}-en`}
              lang={ENGLISH}
              placeholder={t('form.question.textEnPlaceholder')}
              disabled={!isEditable}
              aria-invalid={fieldState.invalid}
              onBlur={() => {
                field.onBlur();
                if (field.value !== question.text_en) {
                  save({ text_en: field.value });
                }
              }}
            />
            <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
          </Field>
        )}
      />
      <Controller
        name="requiredMedia"
        control={form.control}
        render={({ field }) => (
          <Field className="w-full max-w-60">
            <FieldLabel htmlFor={`${baseId}-media`}>{t('form.question.media')}</FieldLabel>
            <Select
              value={field.value}
              disabled={!isEditable}
              onValueChange={(value) => {
                const media = REQUIRED_MEDIA.find((option) => option === value);
                if (media) {
                  field.onChange(media);
                  save({ required_media: media });
                }
              }}
            >
              <SelectTrigger id={`${baseId}-media`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REQUIRED_MEDIA.map((media) => (
                  <SelectItem key={media} value={media}>
                    {t(`form.question.mediaOptions.${media}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      />
      {isEditable ? (
        <ConfirmDialog
          isOpen={isRemoveOpen}
          onOpenChange={setIsRemoveOpen}
          tone="destructive"
          title={t('form.question.removeTitle', { number: question.number })}
          description={t('form.question.removeDescription')}
          confirmLabel={t('form.question.removeConfirm')}
          pendingLabel={t('form.question.removing')}
          isPending={removeQuestion.isPending}
          onConfirm={() => {
            removeQuestion.mutate(question.id, {
              onSuccess: () => {
                setIsRemoveOpen(false);
              },
            });
          }}
        />
      ) : null}
    </article>
  );
}
