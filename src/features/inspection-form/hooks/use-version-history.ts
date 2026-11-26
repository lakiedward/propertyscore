import type { UseMutationResult } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { VersionItem } from '../inspection-form.types';

const route = getRouteApi('/_authenticated/admin/content');

export type VersionRequest = { kind: 'restore' | 'delete'; item: VersionItem };

type VersionHistoryOptions = {
  defaultId: string | null;
  nextLabel: string;
  restore: UseMutationResult<string, Error, string>;
  remove: UseMutationResult<void, Error, string>;
};

export function useVersionHistory({
  defaultId,
  nextLabel,
  restore,
  remove,
}: VersionHistoryOptions) {
  const { t } = useTranslation('inspectionForm');
  const navigate = route.useNavigate();
  const [request, setRequest] = useState<VersionRequest | null>(null);

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
    request,
    setRequest,
    view,
    confirm,
    isPending: restore.isPending || remove.isPending,
  };
}
