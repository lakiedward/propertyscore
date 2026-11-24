import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { PencilIcon, PlusIcon, SaveIcon, Trash2Icon, UploadIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InlineToast } from '@/components/feedback/inline-toast';
import { EmptyState } from '@/components/layout/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { oneOf } from '@/lib/utils';
import {
  inspectionFormQueries,
  useAddConsentSection,
  useCreateConsentDraft,
  useDiscardConsentDraft,
  usePublishConsent,
  useRemoveConsentSection,
  useSaveConsentSections,
} from '../api/inspection-form.queries';
import {
  CONSENT_LANGUAGES,
  type ConsentEditor as ConsentEditorData,
  type ConsentSectionPatch,
} from '../inspection-form.types';
import { versionLabel } from '@/lib/version-label';
import { ConsentVersionList } from './consent-version-list';

const route = getRouteApi('/_authenticated/admin/content');

type ConsentFormValues = { sections: ConsentSectionPatch[] };

function sectionValues(editor: ConsentEditorData): ConsentFormValues {
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
  const navigate = route.useNavigate();
  const baseId = useId();
  const { data: editor } = useSuspenseQuery(inspectionFormQueries.consent());
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
  const form = useForm<ConsentFormValues>({
    values: sectionValues(editor),
    resetOptions: { keepDirtyValues: true },
  });
  const { fields } = useFieldArray({ control: form.control, name: 'sections', keyName: 'key' });
  const language = search.lang;
  const isDraft = editor.draft !== null;

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

  const shownVersion = versionLabel(editor.shown.version);
  const dirtySections = () => {
    const dirty = form.formState.dirtyFields.sections ?? [];
    return form
      .getValues('sections')
      .filter((_, index) => Object.keys(dirty[index] ?? {}).length > 0);
  };

  const saveDraft = (onSaved?: () => void) => {
    const changed = dirtySections();
    if (changed.length === 0) {
      onSaved?.();
      return;
    }
    saveSections.mutate(changed, {
      onSuccess: () => {
        form.reset(form.getValues());
        onSaved?.();
      },
    });
  };

  const draft = editor.draft;

  return (
    <div className="grid grid-cols-1 items-start gap-4 w1180:grid-cols-[280px_minmax(0,1fr)]">
      <ConsentVersionList versions={editor.versions} />
      <div className="flex min-w-0 flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-card bg-card px-4 py-3.5 shadow-card-soft">
          <div className="flex min-w-0 flex-col">
            <strong className="text-base font-extrabold">
              {t(isDraft ? 'consent.titleDraft' : 'consent.titlePublished', {
                version: shownVersion,
                language: t(`consent.languages.${language}`),
              })}
            </strong>
            <span className="text-small text-muted-foreground">{t('consent.helper')}</span>
          </div>
          <ToggleGroup
            type="single"
            value={language}
            onValueChange={(value) => {
              const lang = oneOf(CONSENT_LANGUAGES, value);
              if (lang) {
                void navigate({ search: (previous) => ({ ...previous, lang }), replace: true });
              }
            }}
            aria-label={t('consent.languageLabel')}
            className="gap-0 rounded-md border border-border bg-card p-0.75"
          >
            {CONSENT_LANGUAGES.map((option) => (
              <ToggleGroupItem
                key={option}
                value={option}
                lang={option}
                className="touch-target h-7.5 min-w-12 rounded-[6px] px-3 text-caption font-bold text-brand data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {option.toUpperCase()}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        {isDraft ? null : (
          <Alert tone="info">
            <AlertTitle>{t('consent.readOnly.title')}</AlertTitle>
            <AlertDescription>{t('consent.readOnly.text')}</AlertDescription>
          </Alert>
        )}
        {fields.map((section, index) => (
          <section
            key={section.key}
            aria-labelledby={`${baseId}-section-${String(index)}`}
            className="flex flex-col gap-3 rounded-lg border border-card bg-card px-4.5 py-4 shadow-card-soft"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                id={`${baseId}-section-${String(index)}`}
                className="text-eyebrow font-bold text-muted-foreground uppercase"
              >
                {t('consent.section', { number: index + 1 })}
              </span>
              {isDraft ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('consent.removeSection', { number: index + 1 })}
                  onClick={() => {
                    setDialog({ kind: 'remove', index });
                  }}
                >
                  <Trash2Icon aria-hidden />
                </Button>
              ) : null}
            </div>
            <Controller
              key={`title-${language}`}
              name={`sections.${index}.title_${language}`}
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={`${baseId}-${String(index)}-title`}>
                    {t('consent.fields.title')}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={`${baseId}-${String(index)}-title`}
                    lang={language}
                    maxLength={120}
                    disabled={!isDraft}
                  />
                </Field>
              )}
            />
            <Controller
              key={`text-${language}`}
              name={`sections.${index}.text_${language}`}
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={`${baseId}-${String(index)}-text`}>
                    {t('consent.fields.text')}
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id={`${baseId}-${String(index)}-text`}
                    lang={language}
                    maxLength={3000}
                    disabled={!isDraft}
                    className="min-h-37.5"
                  />
                </Field>
              )}
            />
            <Controller
              key={`check-${language}`}
              name={`sections.${index}.check_${language}`}
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={`${baseId}-${String(index)}-check`}>
                    {t('consent.fields.check')}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={`${baseId}-${String(index)}-check`}
                    lang={language}
                    maxLength={200}
                    disabled={!isDraft}
                  />
                </Field>
              )}
            />
          </section>
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
