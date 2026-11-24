import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { toWebp } from '@/lib/images';
import {
  PHOTO_MAX_EDGE,
  type InspectionAnswer,
  type InspectionMediaKind,
  type SignerLanguage,
  type Workspace,
} from '../field-inspection.types';
import {
  getProgress,
  getWorkspace,
  registerMedia,
  saveAnswer,
  startInspection,
  submitInspection,
  unregisterMedia,
} from './field-inspection.api';
import {
  questionMediaPath,
  removeInspectionFile,
  signInspectionFiles,
  signaturePath,
  uploadInspectionFile,
} from './field-inspection.storage';

const INSPECTIONS_KEY = ['inspections'] as const;

export const fieldInspectionQueries = {
  all: () => ['field-inspection'] as const,
  workspace: (inspectionId: string) =>
    queryOptions({
      queryKey: [...fieldInspectionQueries.all(), 'workspace', inspectionId],
      queryFn: () => getWorkspace(inspectionId),
    }),
  progress: (inspectionId: string) =>
    queryOptions({
      queryKey: [...fieldInspectionQueries.all(), 'progress', inspectionId],
      queryFn: () => getProgress(inspectionId),
    }),
  fileUrls: (paths: readonly string[]) =>
    queryOptions({
      queryKey: [...fieldInspectionQueries.all(), 'file-urls', paths],
      queryFn: () => signInspectionFiles(paths),
      staleTime: 1_800_000,
    }),
};

function useInvalidateInspection(inspectionId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: fieldInspectionQueries.workspace(inspectionId).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: fieldInspectionQueries.progress(inspectionId).queryKey,
      }),
      queryClient.invalidateQueries({ queryKey: INSPECTIONS_KEY }),
    ]);
}

export function useStartInspection(inspectionId: string) {
  const invalidate = useInvalidateInspection(inspectionId);
  return useMutation({
    mutationFn: async (input: {
      signature: Blob;
      signerName: string;
      language: SignerLanguage;
      sectionIds: string[];
    }) => {
      const path = signaturePath(inspectionId);
      await uploadInspectionFile(path, input.signature, 'image/png');
      try {
        await startInspection({
          inspectionId,
          signerName: input.signerName,
          language: input.language,
          signaturePath: path,
          sectionIds: input.sectionIds,
        });
      } catch (error) {
        await removeInspectionFile(path).catch(() => undefined);
        throw error;
      }
    },
    onSuccess: invalidate,
  });
}

export function useSaveAnswer(inspectionId: string) {
  const queryClient = useQueryClient();
  const workspaceKey = fieldInspectionQueries.workspace(inspectionId).queryKey;
  return useMutation({
    mutationFn: (input: { questionId: string; answer: InspectionAnswer; note: string }) =>
      saveAnswer({ inspectionId, ...input }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: workspaceKey });
      const previous = queryClient.getQueryData(workspaceKey);
      queryClient.setQueryData(workspaceKey, (current: Workspace | undefined) =>
        current
          ? {
              ...current,
              answers: [
                ...current.answers.filter((answer) => answer.question_id !== input.questionId),
                { question_id: input.questionId, answer: input.answer, note: input.note },
              ],
            }
          : current,
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(workspaceKey, context.previous);
      }
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: workspaceKey }),
        queryClient.invalidateQueries({
          queryKey: fieldInspectionQueries.progress(inspectionId).queryKey,
        }),
        queryClient.invalidateQueries({ queryKey: INSPECTIONS_KEY }),
      ]),
  });
}

export function useAddMedia(inspectionId: string) {
  const invalidate = useInvalidateInspection(inspectionId);
  return useMutation({
    mutationFn: async (input: { questionId: string; kind: InspectionMediaKind; file: File }) => {
      const isPhoto = input.kind === 'photo';
      const blob = isPhoto ? await toWebp(input.file, PHOTO_MAX_EDGE) : input.file;
      const contentType = isPhoto ? 'image/webp' : input.file.type;
      const extension = isPhoto
        ? 'webp'
        : (input.file.name.split('.').pop() ?? 'mp4').toLowerCase();
      const path = questionMediaPath(inspectionId, extension);
      await uploadInspectionFile(path, blob, contentType);
      try {
        await registerMedia({
          inspectionId,
          questionId: input.questionId,
          kind: input.kind,
          path,
          mimeType: contentType,
          sizeBytes: blob.size,
        });
      } catch (error) {
        await removeInspectionFile(path).catch(() => undefined);
        throw error;
      }
    },
    onSettled: invalidate,
  });
}

export function useRemoveMedia(inspectionId: string) {
  const invalidate = useInvalidateInspection(inspectionId);
  return useMutation({
    mutationFn: async (mediaId: string) => {
      const path = await unregisterMedia(mediaId);
      await removeInspectionFile(path).catch(() => undefined);
    },
    onSettled: invalidate,
  });
}

export function useSubmitInspection(inspectionId: string) {
  const invalidate = useInvalidateInspection(inspectionId);
  return useMutation({
    mutationFn: (ownerName: string) => submitInspection({ inspectionId, ownerName }),
    onSuccess: invalidate,
  });
}
