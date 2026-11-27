import { zodResolver } from '@hookform/resolvers/zod';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { InlineToast } from '@/components/feedback/inline-toast';
import { SegmentedControl } from '@/components/forms/segmented-control';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SUPPORTED_LOCALES } from '@/i18n/i18n';
import { versionLabel } from '@/lib/version-label';
import {
  inspectionFormQueries,
  useAddConsentSection,
  useCreateConsentDraft,
  useDeleteConsentVersion,
  useDiscardConsentDraft,
  usePublishConsent,
  useRemoveConsentSection,
  useRestoreConsentVersion,
  useSaveConsentSections,
} from '../api/inspection-form.queries';
import { useVersionHistory } from '../hooks/use-version-history';
import { consentSectionsSchema, type ConsentSectionsValues } from '../inspection-form.schemas';
import type { ConsentEditor as ConsentEditorData } from '../inspection-form.types';
import { changedSections, nextConsentVersion } from '../inspection-form.utils';
import { ConsentActionBar } from './consent-action-bar';
import { ConsentDialogs, type ConsentDialog } from './consent-dialogs';
import { ConsentSectionFields } from './consent-section-fields';
import { CreateDraftEmptyState } from './create-draft-empty-state';
import { VersionBanner } from './version-banner';
import { VersionDialogs } from './version-dialogs';
import { VersionList } from './version-list';

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
  const search = route.useSearch();
  const viewedId = search.tab === 'consent' ? (search.version ?? null) : null;
  const { data: editor } = useSuspenseQuery(inspectionFormQueries.consent(viewedId));
  const createDraft = useCreateConsentDraft();

  if (!editor.shown) {
    return (
      <CreateDraftEmptyState
        title={t('consent.empty.title')}
        description={t('consent.empty.description')}
        actionLabel={t('consent.createDraft')}
        isPending={createDraft.isPending}
        onCreate={() => {
          createDraft.mutate();
        }}
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
  const [dialog, setDialog] = useState<ConsentDialog | null>(null);
  const [publishedVersion, setPublishedVersion] = useState<string | null>(null);
  const form = useForm<ConsentSectionsValues>({
    resolver: zodResolver(consentSectionsSchema),
    values: sectionValues(editor),
    resetOptions: { keepDirtyValues: true },
  });
  const { fields } = useFieldArray({ control: form.control, name: 'sections', keyName: 'key' });
  const language = search.lang;
  const draft = editor.shown?.status === 'draft' ? editor.draft : null;
  const shownVersion = editor.shown ? versionLabel(editor.shown.version) : '';
  const history = useVersionHistory({
    editor,
    label: (version) => t('versions.label', { version: versionLabel(version) }),
    nextVersion: nextConsentVersion,
    restore: useRestoreConsentVersion(),
    remove: useDeleteConsentVersion(),
  });
  const { isViewing } = history;

  const saveDraft = (onSaved?: () => void) => {
    if (!draft) {
      return;
    }
    void form.handleSubmit((values) => {
      const changed = changedSections(values.sections, form.formState.dirtyFields.sections);
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
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <VersionList {...history.list} />
      <div className="flex min-w-0 flex-col gap-3.5">
        {history.banner ? <VersionBanner {...history.banner} /> : null}
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
            options={SUPPORTED_LOCALES.map((option) => ({
              value: option,
              label: tCommon(`language.short.${option}`),
              lang: option,
            }))}
          />
        </div>
        {draft || isViewing ? null : (
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
        <ConsentActionBar
          isDraft={draft !== null}
          isHidden={isViewing}
          isSaving={saveSections.isPending}
          isPublishing={publish.isPending}
          isCreating={createDraft.isPending}
          onDiscard={() => {
            setDialog({ kind: 'discard' });
          }}
          onSave={() => {
            saveDraft();
          }}
          onPublish={() => {
            if (!draft) {
              return;
            }
            saveDraft(() => {
              publish.mutate(draft.id, {
                onSuccess: () => {
                  setPublishedVersion(versionLabel(draft.version));
                },
              });
            });
          }}
          onCreateDraft={() => {
            setPublishedVersion(null);
            createDraft.mutate();
          }}
        />
      </div>
      <VersionDialogs {...history.dialogs} />
      {draft ? (
        <ConsentDialogs
          dialog={dialog}
          version={shownVersion}
          isDiscarding={discardDraft.isPending}
          isRemoving={removeSection.isPending}
          onDialogChange={setDialog}
          onDiscard={() => {
            discardDraft.mutate(draft.id, {
              onSuccess: () => {
                setDialog(null);
              },
            });
          }}
          onRemove={(index) => {
            const section = fields[index];
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
      ) : null}
    </div>
  );
}
