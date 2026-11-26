import { PencilIcon, SaveIcon, UploadIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ConsentActionBarProps = {
  isDraft: boolean;
  isHidden: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  isCreating: boolean;
  onDiscard: () => void;
  onSave: () => void;
  onPublish: () => void;
  onCreateDraft: () => void;
};

export function ConsentActionBar({
  isDraft,
  isHidden,
  isSaving,
  isPublishing,
  isCreating,
  onDiscard,
  onSave,
  onPublish,
  onCreateDraft,
}: ConsentActionBarProps) {
  const { t } = useTranslation('inspectionForm');

  return (
    <div className={cn('flex flex-wrap justify-end gap-2', isHidden && 'hidden')}>
      {isDraft ? (
        <>
          <Button type="button" variant="ghost" size="md" onClick={onDiscard}>
            {t('consent.discard')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={isSaving}
            aria-busy={isSaving}
            onClick={onSave}
          >
            <SaveIcon aria-hidden />
            {isSaving ? t('consent.saving') : t('consent.save')}
          </Button>
          <Button
            type="button"
            size="md"
            disabled={isPublishing}
            aria-busy={isPublishing}
            onClick={onPublish}
          >
            <UploadIcon aria-hidden />
            {isPublishing ? t('consent.publishing') : t('consent.publish')}
          </Button>
        </>
      ) : (
        <Button type="button" size="md" disabled={isCreating} onClick={onCreateDraft}>
          <PencilIcon aria-hidden />
          {t('consent.createDraft')}
        </Button>
      )}
    </div>
  );
}
