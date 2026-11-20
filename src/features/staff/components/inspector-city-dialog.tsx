import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useValidationMessage } from '@/i18n/validation';
import { staffQueries, useSetInspector } from '../api/staff.queries';
import { inspectorCitySchema, type InspectorCityValues } from '../staff.schemas';

type InspectorCityDialogProps = {
  userId: string;
  name: string;
  cityId: string | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function InspectorCityDialog({
  userId,
  name,
  cityId,
  isOpen,
  onOpenChange,
}: InspectorCityDialogProps) {
  const { t } = useTranslation('staff');
  const validationMessage = useValidationMessage();
  const formId = useId();
  const cityFieldId = useId();
  const cities = useQuery(staffQueries.cities());
  const setInspector = useSetInspector();
  const form = useForm<InspectorCityValues>({
    resolver: zodResolver(inspectorCitySchema),
    values: { cityId: cityId ?? '' },
  });

  const handleSubmit = form.handleSubmit((values) => {
    setInspector.mutate(
      { userId, cityId: values.cityId },
      {
        onSuccess: () => {
          const city = cities.data?.find((option) => option.id === values.cityId)?.name ?? '';
          toast.success(t('users.inspectorDialog.saved', { name, city }));
          onOpenChange(false);
        },
      },
    );
  });

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('users.inspectorDialog.title')}
      description={t('users.inspectorDialog.description', { name })}
      confirmLabel={t('users.inspectorDialog.save')}
      pendingLabel={t('users.inspectorDialog.saving')}
      isPending={setInspector.isPending}
      formId={formId}
    >
      <form id={formId} onSubmit={(event) => void handleSubmit(event)} noValidate>
        <Controller
          name="cityId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={cityFieldId}>{t('users.inspectorDialog.city')}</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={cityFieldId} aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder={t('users.inspectorDialog.cityPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {(cities.data ?? []).map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
            </Field>
          )}
        />
      </form>
    </ConfirmDialog>
  );
}
