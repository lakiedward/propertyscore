import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { CategoryIcon } from '@/components/inspection/category-icon';
import { CATEGORY_ICON_KEYS, isCategoryIconKey } from '@/components/inspection/category-icons';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
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
  inspectionFormQueries,
  useAddFormCategory,
  useUpdateFormCategory,
} from '../api/inspection-form.queries';
import { categorySchema, type CategoryValues } from '../inspection-form.schemas';
import type { FormCategory } from '../inspection-form.types';

type CategoryDialogProps = {
  versionId: string;
  category: FormCategory | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAdded?: (key: string) => void;
};

export function CategoryDialog({
  versionId,
  category,
  isOpen,
  onOpenChange,
  onAdded,
}: CategoryDialogProps) {
  const { t } = useTranslation('inspectionForm');
  const validationMessage = useValidationMessage();
  const queryClient = useQueryClient();
  const formId = useId();
  const nameRoId = useId();
  const nameEnId = useId();
  const iconId = useId();
  const addCategory = useAddFormCategory();
  const updateCategory = useUpdateFormCategory();
  const isPending = addCategory.isPending || updateCategory.isPending;
  const form = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    values: {
      nameRo: category?.name_ro ?? '',
      nameEn: category?.name_en ?? '',
      icon: category && isCategoryIconKey(category.icon) ? category.icon : 'clipboard-check',
    },
  });

  const close = () => {
    form.reset();
    onOpenChange(false);
  };

  const handleSubmit = form.handleSubmit((values) => {
    if (category) {
      updateCategory.mutate(
        {
          categoryId: category.id,
          patch: { name_ro: values.nameRo, name_en: values.nameEn, icon: values.icon },
        },
        { onSuccess: close },
      );
      return;
    }
    addCategory.mutate(
      { versionId, category: values },
      {
        onSuccess: (categoryId) => {
          close();
          void queryClient
            .query({ ...inspectionFormQueries.editor(null), staleTime: 0 })
            .then((editor) => {
              const added = editor.categories.find((item) => item.id === categoryId);
              if (added) {
                onAdded?.(added.key);
              }
            });
        },
      },
    );
  });

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          form.reset();
        }
        onOpenChange(open);
      }}
      title={category ? t('form.category.dialog.editTitle') : t('form.category.dialog.addTitle')}
      description={t('form.category.dialog.description')}
      confirmLabel={category ? t('form.category.dialog.save') : t('form.category.dialog.add')}
      pendingLabel={t('form.category.dialog.saving')}
      isPending={isPending}
      formId={formId}
    >
      <form id={formId} onSubmit={(event) => void handleSubmit(event)} noValidate>
        <FieldGroup>
          <Controller
            name="nameRo"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={nameRoId}>{t('form.category.dialog.nameRo')}</FieldLabel>
                <Input {...field} id={nameRoId} aria-invalid={fieldState.invalid} />
                <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
              </Field>
            )}
          />
          <Controller
            name="nameEn"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={nameEnId}>{t('form.category.dialog.nameEn')}</FieldLabel>
                <Input {...field} id={nameEnId} aria-invalid={fieldState.invalid} />
                <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
              </Field>
            )}
          />
          <Controller
            name="icon"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={iconId}>{t('form.category.dialog.icon')}</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id={iconId} aria-invalid={fieldState.invalid}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_ICON_KEYS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        <CategoryIcon icon={icon} className="text-brand" />
                        {t(`form.icons.${icon}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
        </FieldGroup>
      </form>
    </ConfirmDialog>
  );
}
