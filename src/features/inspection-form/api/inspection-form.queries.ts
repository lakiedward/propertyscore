import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addFormCategory,
  addFormQuestion,
  createFormDraft,
  deleteFormVersion,
  restoreFormVersion,
  discardFormDraft,
  getFormEditor,
  moveFormQuestion,
  publishForm,
  removeFormCategory,
  removeFormQuestion,
  reorderFormCategories,
  reorderFormQuestions,
  splitQuestionWeights,
  updateFormCategory,
  updateFormPoints,
  updateFormQuestion,
} from './inspection-form.api';
import {
  addConsentSection,
  createConsentDraft,
  deleteConsentVersion,
  restoreConsentVersion,
  discardConsentDraft,
  getConsentEditor,
  publishConsent,
  removeConsentSection,
  saveConsentSections,
} from './consent.api';

export const inspectionFormQueries = {
  all: () => ['inspection-form'] as const,
  editors: () => [...inspectionFormQueries.all(), 'editor'] as const,
  editor: (viewedId: string | null) =>
    queryOptions({
      queryKey: [...inspectionFormQueries.editors(), viewedId],
      queryFn: () => getFormEditor(viewedId),
    }),
  consents: () => [...inspectionFormQueries.all(), 'consent'] as const,
  consent: (viewedId: string | null) =>
    queryOptions({
      queryKey: [...inspectionFormQueries.consents(), viewedId],
      queryFn: () => getConsentEditor(viewedId),
    }),
};

function useFormMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: inspectionFormQueries.editors() }),
  });
}

export function useCreateFormDraft() {
  return useFormMutation(createFormDraft);
}

export function useRestoreFormVersion() {
  return useFormMutation(restoreFormVersion);
}

export function useDeleteFormVersion() {
  return useFormMutation(deleteFormVersion);
}

export function useDiscardFormDraft() {
  return useFormMutation(discardFormDraft);
}

export function usePublishForm() {
  return useFormMutation(publishForm);
}

export function useUpdateFormPoints() {
  return useFormMutation(updateFormPoints);
}

export function useAddFormCategory() {
  return useFormMutation(addFormCategory);
}

export function useUpdateFormCategory() {
  return useFormMutation(updateFormCategory);
}

export function useRemoveFormCategory() {
  return useFormMutation(removeFormCategory);
}

export function useReorderFormCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reorderFormCategories,
    scope: { id: 'form-category-order' },
    onSettled: () => queryClient.invalidateQueries({ queryKey: inspectionFormQueries.editors() }),
  });
}

export function useAddFormQuestion() {
  return useFormMutation(addFormQuestion);
}

export function useUpdateFormQuestion() {
  return useFormMutation(updateFormQuestion);
}

export function useRemoveFormQuestion() {
  return useFormMutation(removeFormQuestion);
}

export function useReorderFormQuestions() {
  return useFormMutation(reorderFormQuestions);
}

export function useSplitQuestionWeights() {
  return useFormMutation(splitQuestionWeights);
}

export function useMoveFormQuestion() {
  return useFormMutation(moveFormQuestion);
}

function useConsentMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: inspectionFormQueries.consents() }),
  });
}

export function useCreateConsentDraft() {
  return useConsentMutation(createConsentDraft);
}

export function useRestoreConsentVersion() {
  return useConsentMutation(restoreConsentVersion);
}

export function useDeleteConsentVersion() {
  return useConsentMutation(deleteConsentVersion);
}

export function useDiscardConsentDraft() {
  return useConsentMutation(discardConsentDraft);
}

export function usePublishConsent() {
  return useConsentMutation(publishConsent);
}

export function useAddConsentSection() {
  return useConsentMutation(addConsentSection);
}

export function useRemoveConsentSection() {
  return useConsentMutation(removeConsentSection);
}

export function useSaveConsentSections() {
  return useConsentMutation(saveConsentSections);
}
