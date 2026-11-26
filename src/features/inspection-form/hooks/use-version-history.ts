import type { UseMutationResult } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { VersionItem } from '../inspection-form.types';
import { toVersionItems, type ListedVersion } from '../inspection-form.utils';

const route = getRouteApi('/_authenticated/admin/content');

export type VersionRequest = { kind: 'restore' | 'delete'; item: VersionItem };

type VersionedEditor = {
  versions: readonly ListedVersion[];
  draft: { id: string } | null;
  published: { id: string } | null;
  shown: { id: string } | null;
  usageCounts: Readonly<Record<string, number>>;
};

type VersionHistoryOptions = {
  editor: VersionedEditor;
  label: (version: number) => string;
  nextVersion: (versions: readonly ListedVersion[]) => number;
  restore: UseMutationResult<string, Error, string>;
  remove: UseMutationResult<void, Error, string>;
};

export function useVersionHistory({
  editor,
  label,
  nextVersion,
  restore,
  remove,
}: VersionHistoryOptions) {
  const { t } = useTranslation('inspectionForm');
  const navigate = route.useNavigate();
  const [request, setRequest] = useState<VersionRequest | null>(null);
  const defaultId = (editor.draft ?? editor.published)?.id ?? null;
  const shownId = editor.shown?.id ?? null;
  const items = toVersionItems(editor.versions, editor.usageCounts, label);
  const nextLabel = label(nextVersion(editor.versions));
  const isViewing = shownId !== null && shownId !== defaultId;
  const viewedItem = isViewing ? (items.find((item) => item.id === shownId) ?? null) : null;
  const hasDraft = editor.draft !== null;

  const view = (id: string | null) => {
    void navigate({
      search: (previous) => ({
        ...previous,
        version: id === null || id === defaultId ? undefined : id,
      }),
    });
  };

  const confirm = () => {
    if (!request) {
      return;
    }
    const { item } = request;
    if (request.kind === 'restore') {
      restore.mutate(item.id, {
        onSuccess: () => {
          setRequest(null);
          view(null);
          toast.success(t('versions.restoredToast', { next: nextLabel, version: item.label }));
        },
      });
      return;
    }
    remove.mutate(item.id, {
      onSuccess: () => {
        setRequest(null);
        view(null);
        toast.success(t('versions.deletedToast', { version: item.label }));
      },
    });
  };

  return {
    isViewing,
    banner: viewedItem
      ? {
          item: viewedItem,
          backLabel: t(hasDraft ? 'versions.backToDraft' : 'versions.backToPublished'),
          onBack: () => {
            view(null);
          },
          onRestore: () => {
            setRequest({ kind: 'restore', item: viewedItem });
          },
        }
      : null,
    list: { items, shownId, onView: view, onRequest: setRequest },
    dialogs: {
      request,
      nextLabel,
      hasDraft,
      isPending: restore.isPending || remove.isPending,
      onClose: () => {
        setRequest(null);
      },
      onConfirm: confirm,
    },
  };
}
