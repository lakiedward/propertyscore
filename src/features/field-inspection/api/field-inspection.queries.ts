import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { inspectionQueries } from '@/features/inspections';
import type { Locale } from '@/i18n/i18n';
import { scaledWebp } from '@/lib/images';
import {
  PHOTO_MAX_EDGE,
  PHOTO_THUMB_MAX_EDGE,
  type InspectionAnswer,
  type InspectionMediaKind,
  type WorkspaceState,
} from '../field-inspection.types';
import {
  getProgress,
  getWorkspace,
  getWorkspaceContent,
  registerMedia,
  saveAnswer,
  startInspection,
  submitInspection,
  unregisterMedia,
} from './field-inspection.api';
import {
  photoThumbPath,
  questionMediaPath,
  removeInspectionFiles,
  signInspectionFiles,
  signaturePath,
  uploadInspectionFile,
  withThumbPaths,
} from './field-inspection.storage';

const FILE_URL_STALE_MS = 1_800_000;

const SAVE_ANSWER_KEY = ['field-inspection', 'save-answer'] as const;

const ADD_MEDIA_KEY = ['field-inspection', 'add-media'] as const;

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
  content: (formVersionId: string | null, consentVersionId: string | null) =>
    queryOptions({
      queryKey: [...fieldInspectionQueries.all(), 'content', formVersionId, consentVersionId],
      queryFn: () => getWorkspaceContent(formVersionId, consentVersionId),
      staleTime: 'static',
    }),
  photoUrls: (photoPaths: readonly string[]) =>
    queryOptions({
      queryKey: [...fieldInspectionQueries.all(), 'photo-urls', [...photoPaths].sort()],
      queryFn: (): Promise<Partial<Record<string, string>>> =>
        signInspectionFiles(withThumbPaths(photoPaths)),
      staleTime: FILE_URL_STALE_MS,
      placeholderData: keepPreviousData,
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
      queryClient.invalidateQueries({ queryKey: inspectionQueries.all() }),
    ]);
}

export function useStartInspection(inspectionId: string) {
  const invalidate = useInvalidateInspection(inspectionId);
  return useMutation({
    mutationFn: async (input: {
      signature: Blob;
      signerName: string;
      language: Locale;
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
        await removeInspectionFiles([path]).catch(() => undefined);
        throw error;
      }
    },
    onSettled: invalidate,
  });
}

export function useSaveAnswer(inspectionId: string) {
  const queryClient = useQueryClient();
  const workspaceKey = fieldInspectionQueries.workspace(inspectionId).queryKey;
  return useMutation({
    mutationKey: [...SAVE_ANSWER_KEY, inspectionId],
    mutationFn: (input: { questionId: string; answer: InspectionAnswer | null; note: string }) =>
      saveAnswer({ inspectionId, ...input }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: workspaceKey });
      queryClient.setQueryData(workspaceKey, (current: WorkspaceState | undefined) => {
        if (!current) {
          return current;
        }
        const previous = current.answers.find((answer) => answer.question_id === input.questionId);
        return {
          ...current,
          answers: [
            ...current.answers.filter((answer) => answer.question_id !== input.questionId),
            {
              question_id: input.questionId,
              answer: input.answer ?? previous?.answer ?? null,
              note: input.note,
            },
          ],
        };
      });
    },
    onError: () => queryClient.invalidateQueries({ queryKey: workspaceKey }),
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: fieldInspectionQueries.progress(inspectionId).queryKey,
      });
      if (queryClient.isMutating({ mutationKey: [...SAVE_ANSWER_KEY, inspectionId] }) <= 1) {
        await queryClient.invalidateQueries({
          queryKey: inspectionQueries.all(),
          refetchType: 'none',
        });
      }
    },
  });
}

async function questionMediaFiles(kind: InspectionMediaKind, file: File) {
  if (kind === 'video') {
    const extension = (file.name.split('.').pop() ?? 'mp4').toLowerCase();
    return { full: file, thumb: null, contentType: file.type, extension };
  }
  const bitmap = await createImageBitmap(file);
  try {
    const full = await scaledWebp(bitmap, PHOTO_MAX_EDGE);
    const thumb = await scaledWebp(bitmap, PHOTO_THUMB_MAX_EDGE);
    return { full, thumb, contentType: 'image/webp', extension: 'webp' };
  } finally {
    bitmap.close();
  }
}

export function useAddMedia(inspectionId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateInspection(inspectionId);
  const mutationKey = [...ADD_MEDIA_KEY, inspectionId];
  return useMutation({
    mutationKey,
    scope: { id: mutationKey.join(':') },
    mutationFn: async (input: { questionId: string; kind: InspectionMediaKind; file: File }) => {
      const files = await questionMediaFiles(input.kind, input.file);
      const path = questionMediaPath(inspectionId, files.extension);
      const thumbPath = photoThumbPath(path);
      const uploaded = thumbPath && files.thumb ? [path, thumbPath] : [path];
      await uploadInspectionFile(path, files.full, files.contentType);
      try {
        if (thumbPath && files.thumb) {
          await uploadInspectionFile(thumbPath, files.thumb, files.contentType);
        }
        await registerMedia({
          inspectionId,
          questionId: input.questionId,
          kind: input.kind,
          path,
          mimeType: files.contentType,
          sizeBytes: files.full.size,
        });
      } catch (error) {
        await removeInspectionFiles(uploaded).catch(() => undefined);
        throw error;
      }
    },
    onSettled: async () => {
      if (queryClient.isMutating({ mutationKey }) <= 1) {
        await invalidate();
      }
    },
  });
}

export function useRemoveMedia(inspectionId: string) {
  const invalidate = useInvalidateInspection(inspectionId);
  return useMutation({
    mutationFn: async (mediaId: string) => {
      const path = await unregisterMedia(mediaId);
      await removeInspectionFiles(withThumbPaths([path])).catch(() => undefined);
    },
    onSettled: invalidate,
  });
}

export function useSubmitInspection(inspectionId: string) {
  const invalidate = useInvalidateInspection(inspectionId);
  return useMutation({
    mutationFn: (ownerName: string) => submitInspection({ inspectionId, ownerName }),
    meta: { silent: true },
    onSuccess: invalidate,
  });
}
