import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addFormCategory,
  addFormQuestion,
  createFormDraft,
  discardFormDraft,
  getFormEditor,
  moveFormQuestion,
  publishForm,
  removeFormCategory,
  removeFormQuestion,
  reorderFormCategories,
  reorderFormQuestions,
  updateFormCategory,
  updateFormPoints,
  updateFormQuestion,
} from './inspection-form.api';
import {
  addConsentSection,
  createConsentDraft,
  discardConsentDraft,
  getConsentEditor,
  publishConsent,
  removeConsentSection,
  saveConsentSections,
} from './consent.api';

export const inspectionFormQueries = {
  all: () => ['inspection-form'] as const,
  editor: () =>
    queryOptions({
      queryKey: [...inspectionFormQueries.all(), 'editor'],
      queryFn: getFormEditor,
    }),
  consent: () =>
    queryOptions({
      queryKey: [...inspectionFormQueries.all(), 'consent'],
      queryFn: getConsentEditor,
    }),
};

function useFormMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: inspectionFormQueries.editor().queryKey }),
  });
}

export function useCreateFormDraft() {
  return useFormMutation(createFormDraft);
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
  return useFormMutation(reorderFormCategories);
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

export function useMoveFormQuestion() {
  return useFormMutation(moveFormQuestion);
}

function useConsentMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: inspectionFormQueries.consent().queryKey }),
  });
}

export function useCreateConsentDraft() {
  return useConsentMutation(createConsentDraft);
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
