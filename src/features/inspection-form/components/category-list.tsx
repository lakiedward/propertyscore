import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { getRouteApi } from '@tanstack/react-router';
import { GripVerticalIcon, PlusIcon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CategoryIcon } from '@/components/inspection/category-icon';
import { localizedText } from '@/i18n/localized';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useReorderFormCategories, useUpdateFormCategory } from '../api/inspection-form.queries';
import type { FormCategory } from '../inspection-form.types';
import {
  isSameOrder,
  moveItem,
  moveItemTo,
  orderByIds,
  parseWeight,
  WEIGHT_TOTAL,
} from '../inspection-form.utils';
import { CategoryDialog } from './category-dialog';
import type { WeightValues } from './form-editor';
import { WeightInput } from './weight-input';

const route = getRouteApi('/_authenticated/admin/content');

const DRAG_DISTANCE = 6;

type CategoryListProps = {
  versionId: string;
  categories: readonly FormCategory[];
  selectedId: string | undefined;
  control: Control<WeightValues>;
  questionTotals: Readonly<Record<string, number>>;
  isEditable: boolean;
};

export function CategoryList({
  versionId,
  categories,
  selectedId,
  control,
  questionTotals,
  isEditable,
}: CategoryListProps) {
  const { t, i18n } = useTranslation('inspectionForm');
  const navigate = route.useNavigate();
  const reorder = useReorderFormCategories();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_DISTANCE } }),
  );
  const [pendingOrder, setPendingOrder] = useState<readonly string[] | null>(null);
  if (pendingOrder && isSameOrder(categories, pendingOrder)) {
    setPendingOrder(null);
  }
  const shown = pendingOrder ? orderByIds(categories, pendingOrder) : [...categories];
  const draggedIndex = shown.findIndex((category) => category.id === draggedId);
  const dragged = shown[draggedIndex];
  const nameOf = (category: FormCategory) =>
    localizedText(category.name_ro, category.name_en, i18n.language);

  const saveOrder = (ordered: readonly FormCategory[]) => {
    const categoryIds = ordered.map((category) => category.id);
    setPendingOrder(categoryIds);
    reorder.mutate(
      { versionId, categoryIds },
      {
        onError: () => {
          setPendingOrder(null);
        },
      },
    );
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggedId(null);
    if (!over || over.id === active.id) {
      return;
    }
    const from = shown.findIndex((category) => category.id === active.id);
    const to = shown.findIndex((category) => category.id === over.id);
    saveOrder(moveItemTo(shown, from, to));
  };

  return (
    <nav
      aria-label={t('form.categories.label')}
      className="flex flex-col gap-0.5 rounded-lg border border-card bg-card p-2 shadow-card-soft"
    >
      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => {
          setDraggedId(String(active.id));
        }}
        onDragCancel={() => {
          setDraggedId(null);
        }}
        onDragEnd={handleDragEnd}
        accessibility={{
          screenReaderInstructions: { draggable: t('form.categories.dragInstructions') },
        }}
      >
        <ul className="flex flex-col gap-0.5">
          {shown.map((category, index) => (
            <CategoryRow
              key={category.id}
              category={category}
              name={nameOf(category)}
              isSelected={category.id === selectedId}
              isEditable={isEditable}
              questionTotal={questionTotals[category.id]}
              dropSide={
                draggedIndex === -1 || index === draggedIndex
                  ? null
                  : index < draggedIndex
                    ? 'before'
                    : 'after'
              }
              control={control}
              onMove={(offset) => {
                const target = index + offset;
                if (target >= 0 && target < shown.length) {
                  saveOrder(moveItem(shown, index, offset));
                }
              }}
              onSelect={() => {
                void navigate({
                  search: (previous) => ({ ...previous, category: category.key }),
                  replace: true,
                });
              }}
            />
          ))}
        </ul>
        <DragOverlay>
          {dragged ? (
            <div className="flex items-center gap-2.5 rounded-md bg-card px-2 py-1.5 shadow-lg ring-1 ring-border">
              <GripVerticalIcon aria-hidden className="size-4 text-muted-foreground" />
              <span className="grid size-8 shrink-0 place-items-center rounded-thumb bg-primary text-cta">
                <CategoryIcon icon={dragged.icon} className="size-4" />
              </span>
              <span className="min-w-0 flex-1 text-small font-extrabold">{nameOf(dragged)}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
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

type CategoryRowProps = {
  category: FormCategory;
  name: string;
  isSelected: boolean;
  isEditable: boolean;
  questionTotal: number | undefined;
  dropSide: 'before' | 'after' | null;
  control: Control<WeightValues>;
  onMove: (offset: -1 | 1) => void;
  onSelect: () => void;
};

function CategoryRow({
  category,
  name,
  isSelected,
  isEditable,
  questionTotal,
  dropSide,
  control,
  onMove,
  onSelect,
}: CategoryRowProps) {
  const { t } = useTranslation('inspectionForm');
  const updateCategory = useUpdateFormCategory();
  const draggable = useDraggable({ id: category.id, disabled: !isEditable });
  const droppable = useDroppable({ id: category.id, disabled: !isEditable });
  const isDropTarget = droppable.isOver && dropSide !== null;

  return (
    <li
      ref={(node) => {
        draggable.setNodeRef(node);
        droppable.setNodeRef(node);
      }}
      className={cn(
        'relative flex items-center gap-2 rounded-md py-1.5 pr-2',
        isEditable ? 'pl-0.5' : 'pl-2',
        isSelected && 'bg-surface-selected',
        draggable.isDragging && 'opacity-40',
      )}
    >
      {isDropTarget ? (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-1 h-0.5 rounded-full bg-primary',
            dropSide === 'before' ? '-top-0.5' : '-bottom-0.5',
          )}
        />
      ) : null}
      {isEditable ? (
        <button
          type="button"
          {...draggable.attributes}
          {...draggable.listeners}
          aria-label={t('form.categories.drag', { name })}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault();
              onMove(event.key === 'ArrowUp' ? -1 : 1);
            }
          }}
          className="grid h-10 w-5 shrink-0 cursor-grab touch-none place-items-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring active:cursor-grabbing"
        >
          <GripVerticalIcon aria-hidden className="size-4" />
        </button>
      ) : null}
      <span
        aria-hidden
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-thumb',
          isSelected ? 'bg-primary text-cta' : 'bg-surface-alt text-brand',
        )}
      >
        <CategoryIcon icon={category.icon} className="size-4" />
      </span>
      <button
        type="button"
        aria-current={isSelected ? 'true' : undefined}
        onClick={onSelect}
        className={cn(
          'min-h-10 min-w-0 flex-1 rounded-sm text-left text-small leading-snug outline-none focus-visible:ring-3 focus-visible:ring-ring',
          isSelected ? 'font-extrabold' : 'font-semibold',
        )}
      >
        {name}
      </button>
      {isEditable && questionTotal !== undefined && questionTotal !== WEIGHT_TOTAL ? (
        <span
          title={t('form.categories.questionWeightsOff', { name, sum: questionTotal })}
          className="grid shrink-0 place-items-center text-warning"
        >
          <TriangleAlertIcon aria-hidden className="size-4" />
          <span className="sr-only">
            {t('form.categories.questionWeightsOff', { name, sum: questionTotal })}
          </span>
        </span>
      ) : null}
      <Controller
        name={`weights.${category.id}`}
        control={control}
        render={({ field }) => (
          <WeightInput
            id={`weight-${category.id}`}
            label={t('form.categories.weightLabel', { name })}
            value={field.value}
            isEditable={isEditable}
            onChange={field.onChange}
            onBlur={() => {
              field.onBlur();
              const weight = parseWeight(field.value);
              field.onChange(String(weight));
              if (weight !== category.weight) {
                updateCategory.mutate({ categoryId: category.id, patch: { weight } });
              }
            }}
          />
        )}
      />
    </li>
  );
}
