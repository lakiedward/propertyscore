import { getRouteApi } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { localizedText } from '@/i18n/localized';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useUpdateFormCategory } from '../api/inspection-form.queries';
import type { FormCategory } from '../inspection-form.types';
import { parseWeight } from '../inspection-form.utils';
import { CategoryDialog } from './category-dialog';
import type { WeightValues } from './form-editor';

const route = getRouteApi('/_authenticated/admin/content');

type CategoryListProps = {
  versionId: string;
  categories: readonly FormCategory[];
  selectedId: string | undefined;
  control: Control<WeightValues>;
  isEditable: boolean;
};

export function CategoryList({
  versionId,
  categories,
  selectedId,
  control,
  isEditable,
}: CategoryListProps) {
  const { t, i18n } = useTranslation('inspectionForm');
  const navigate = route.useNavigate();
  const updateCategory = useUpdateFormCategory();
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <nav
      aria-label={t('form.categories.label')}
      className="flex flex-col gap-0.5 rounded-lg border border-card bg-card p-2 shadow-card-soft"
    >
      <ul className="flex flex-col gap-0.5">
        {categories.map((category) => {
          const isSelected = category.id === selectedId;
          const name = localizedText(category.name_ro, category.name_en, i18n.language);
          return (
            <li
              key={category.id}
              className={cn(
                'flex items-center gap-2 rounded-md px-1.5 py-1',
                isSelected && 'bg-surface-selected',
              )}
            >
              <button
                type="button"
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => {
                  void navigate({
                    search: (previous) => ({ ...previous, category: category.key }),
                    replace: true,
                  });
                }}
                className={cn(
                  'min-h-10 min-w-0 flex-1 rounded-sm text-left text-small leading-snug outline-none focus-visible:ring-3 focus-visible:ring-ring',
                  isSelected ? 'font-extrabold' : 'font-semibold',
                )}
              >
                {name}
              </button>
              <Controller
                name={`weights.${category.id}`}
                control={control}
                render={({ field }) => (
                  <Field className="relative w-21.5 shrink-0 gap-0">
                    <FieldLabel htmlFor={`weight-${category.id}`} className="sr-only">
                      {t('form.categories.weightLabel', { name })}
                    </FieldLabel>
                    <Input
                      {...field}
                      id={`weight-${category.id}`}
                      value={field.value}
                      inputMode="numeric"
                      disabled={!isEditable}
                      onChange={(event) => {
                        field.onChange(event.target.value.replace(/\D/gu, '').slice(0, 3));
                      }}
                      onBlur={() => {
                        field.onBlur();
                        const weight = parseWeight(field.value);
                        field.onChange(String(weight));
                        if (weight !== category.weight) {
                          updateCategory.mutate({ categoryId: category.id, patch: { weight } });
                        }
                      }}
                      className="h-10 pr-7 text-right tabular-nums"
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-small text-muted-foreground"
                    >
                      %
                    </span>
                  </Field>
                )}
              />
            </li>
          );
        })}
      </ul>
      {isEditable ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="md"
            className="justify-start"
            onClick={() => {
              setIsAddOpen(true);
            }}
          >
            <PlusIcon aria-hidden />
            {t('form.categories.add')}
          </Button>
          <CategoryDialog
            versionId={versionId}
            category={null}
            isOpen={isAddOpen}
            onOpenChange={setIsAddOpen}
            onAdded={(key) => {
              void navigate({
                search: (previous) => ({ ...previous, category: key }),
                replace: true,
              });
            }}
          />
        </>
      ) : null}
    </nav>
  );
}
