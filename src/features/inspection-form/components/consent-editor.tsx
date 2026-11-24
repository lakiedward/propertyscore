import { zodResolver } from '@hookform/resolvers/zod';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { PencilIcon, PlusIcon, SaveIcon, UploadIcon } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InlineToast } from '@/components/feedback/inline-toast';
import { SegmentedControl } from '@/components/forms/segmented-control';
import { EmptyState } from '@/components/layout/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { versionLabel } from '@/lib/version-label';
import {
  inspectionFormQueries,
  useAddConsentSection,
  useCreateConsentDraft,
  useDiscardConsentDraft,
  usePublishConsent,
  useRemoveConsentSection,
  useSaveConsentSections,
} from '../api/inspection-form.queries';
import { consentSectionsSchema, type ConsentSectionsValues } from '../inspection-form.schemas';
import {
  CONSENT_LANGUAGES,
  type ConsentEditor as ConsentEditorData,
} from '../inspection-form.types';
import { ConsentSectionFields } from './consent-section-fields';
import { ConsentVersionList } from './consent-version-list';

const route = getRouteApi('/_authenticated/admin/content');

function sectionValues(editor: ConsentEditorData): ConsentSectionsValues {
  return {
    sections: editor.sections.map((section) => ({
      id: section.id,
      title_ro: section.title_ro,
      title_en: section.title_en,
      text_ro: section.text_ro,
      text_en: section.text_en,
      check_ro: section.check_ro,
      check_en: section.check_en,
    })),
  };
}

export function ConsentEditor() {
  const { t } = useTranslation('inspectionForm');
  const { data: editor } = useSuspenseQuery(inspectionFormQueries.consent());
  const createDraft = useCreateConsentDraft();

  if (!editor.shown) {
    return (
      <EmptyState
        title={t('consent.empty.title')}
        description={t('consent.empty.description')}
        action={
          <Button
            type="button"
            size="md"
            disabled={createDraft.isPending}
            onClick={() => {
              createDraft.mutate();
            }}
          >
            {t('consent.createDraft')}
          </Button>
        }
      />
    );
  }

  return <ConsentEditorBody key={editor.shown.id} editor={editor} />;
}

type ConsentEditorBodyProps = {
  editor: ConsentEditorData;
};

function ConsentEditorBody({ editor }: ConsentEditorBodyProps) {
  const { t } = useTranslation('inspectionForm');
  const { t: tCommon } = useTranslation('common');
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const createDraft = useCreateConsentDraft();
  const discardDraft = useDiscardConsentDraft();
  const publish = usePublishConsent();
  const saveSections = useSaveConsentSections();
  const addSection = useAddConsentSection();
  const removeSection = useRemoveConsentSection();
  const [dialog, setDialog] = useState<
    { kind: 'discard' } | { kind: 'remove'; index: number } | null
  >(null);
  const [publishedVersion, setPublishedVersion] = useState<string | null>(null);
  const form = useForm<ConsentSectionsValues>({
    resolver: zodResolver(consentSectionsSchema),
    values: sectionValues(editor),
    resetOptions: { keepDirtyValues: true },
  });
  const { fields } = useFieldArray({ control: form.control, name: 'sections', keyName: 'key' });
  const language = search.lang;
  const draft = editor.draft;
  const shownVersion = editor.shown ? versionLabel(editor.shown.version) : '';

  const saveDraft = (onSaved?: () => void) => {
    if (!draft) {
      return;
    }
    void form.handleSubmit((values) => {
      const dirty = form.formState.dirtyFields.sections ?? [];
      const changed = values.sections.filter(
        (_, index) => Object.keys(dirty[index] ?? {}).length > 0,
      );
      if (changed.length === 0) {
        onSaved?.();
        return;
      }
      saveSections.mutate(
        { versionId: draft.id, sections: changed },
        {
          onSuccess: () => {
            form.reset(values);
            onSaved?.();
          },
        },
      );
    })();
  };

  return (
    <div className="grid grid-cols-1 items-start gap-4 w1180:grid-cols-[280px_minmax(0,1fr)]">
      <ConsentVersionList versions={editor.versions} />
      <div className="flex min-w-0 flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-card bg-card px-4 py-3.5 shadow-card-soft">
          <div className="flex min-w-0 flex-col">
            <strong className="text-base font-extrabold">
              {t(draft ? 'consent.titleDraft' : 'consent.titlePublished', {
                version: shownVersion,
                language: t(`consent.languages.${language}`),
              })}
            </strong>
            <span className="text-small text-muted-foreground">{t('consent.helper')}</span>
          </div>
          <SegmentedControl
            ariaLabel={t('consent.languageLabel')}
            value={language}
            onChange={(lang) => {
              void navigate({ search: (previous) => ({ ...previous, lang }), replace: true });
            }}
            options={CONSENT_LANGUAGES.map((option) => ({
              value: option,
              label: tCommon(`language.short.${option}`),
              lang: option,
            }))}
          />
        </div>
        {draft ? null : (
          <Alert tone="info">
            <AlertTitle>{t('consent.readOnly.title')}</AlertTitle>
            <AlertDescription>{t('consent.readOnly.text')}</AlertDescription>
          </Alert>
        )}
        {fields.map((section, index) => (
          <ConsentSectionFields
            key={section.key}
            index={index}
            language={language}
            control={form.control}
            isEditable={draft !== null}
            onRemove={() => {
              setDialog({ kind: 'remove', index });
            }}
          />
        ))}
        {draft ? (
          <Button
            type="button"
            variant="outline"
            size="md"
            className="self-start"
            disabled={addSection.isPending}
            onClick={() => {
              saveDraft(() => {
                addSection.mutate(draft.id);
              });
            }}
          >
            <PlusIcon aria-hidden />
            {t('consent.addSection')}
          </Button>
        ) : null}
        <Alert tone="info">
          <AlertTitle>{t('consent.notice.title')}</AlertTitle>
          <AlertDescription>{t('consent.notice.text')}</AlertDescription>
        </Alert>
        {publishedVersion ? (
          <InlineToast
            tone="success"
            message={t('consent.publishedToast', { version: publishedVersion })}
          />
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          {draft ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => {
                  setDialog({ kind: 'discard' });
                }}
              >
                {t('consent.discard')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="md"
                disabled={saveSections.isPending}
                aria-busy={saveSections.isPending}
                onClick={() => {
                  saveDraft();
                }}
              >
                <SaveIcon aria-hidden />
                {saveSections.isPending ? t('consent.saving') : t('consent.save')}
              </Button>
              <Button
                type="button"
                size="md"
                disabled={publish.isPending}
                aria-busy={publish.isPending}
                onClick={() => {
                  saveDraft(() => {
                    publish.mutate(draft.id, {
                      onSuccess: () => {
                        setPublishedVersion(versionLabel(draft.version));
                      },
                    });
                  });
                }}
              >
                <UploadIcon aria-hidden />
                {publish.isPending ? t('consent.publishing') : t('consent.publish')}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="md"
              disabled={createDraft.isPending}
              onClick={() => {
                setPublishedVersion(null);
                createDraft.mutate();
              }}
            >
              <PencilIcon aria-hidden />
              {t('consent.createDraft')}
            </Button>
          )}
        </div>
      </div>
      {draft ? (
        <>
          <ConfirmDialog
            isOpen={dialog?.kind === 'discard'}
            onOpenChange={(isOpen) => {
              setDialog(isOpen ? { kind: 'discard' } : null);
            }}
            tone="destructive"
            title={t('consent.discardTitle', { version: shownVersion })}
            description={t('consent.discardDescription')}
            confirmLabel={t('consent.discard')}
            pendingLabel={t('consent.discarding')}
            isPending={discardDraft.isPending}
            onConfirm={() => {
              discardDraft.mutate(draft.id, {
                onSuccess: () => {
                  setDialog(null);
                },
              });
            }}
          />
          <ConfirmDialog
            isOpen={dialog?.kind === 'remove'}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setDialog(null);
              }
            }}
            tone="destructive"
            title={t('consent.removeTitle', {
              number: (dialog?.kind === 'remove' ? dialog.index : 0) + 1,
            })}
            description={t('consent.removeDescription')}
            confirmLabel={t('consent.removeConfirm')}
            pendingLabel={t('consent.removing')}
            isPending={removeSection.isPending}
            onConfirm={() => {
              const section = dialog?.kind === 'remove' ? fields[dialog.index] : undefined;
              if (!section) {
                return;
              }
              saveDraft(() => {
                removeSection.mutate(section.id, {
                  onSuccess: () => {
                    setDialog(null);
                  },
                });
              });
            }}
          />
        </>
      ) : null}
    </div>
  );
}
