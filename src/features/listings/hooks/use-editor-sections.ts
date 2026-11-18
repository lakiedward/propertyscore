import { useState } from 'react';
import { flushSync } from 'react-dom';
import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  EDITOR_SECTIONS,
  fieldsOf,
  isEditorSection,
  SECTION_FIELDS,
  sectionsWithErrors,
  type EditorSection,
} from '../listing-editor.sections';
import type { ListingFormValues } from '../listing-form.schemas';

export type SectionStatus = { tone: 'error' | 'success'; label: string } | undefined;

function union<T>(current: readonly T[], added: readonly T[]): T[] {
  return [...new Set([...current, ...added])];
}

type UseEditorSectionsOptions = {
  form: UseFormReturn<ListingFormValues>;
  initialSection: EditorSection | undefined;
  missingPhotos: number;
  sectionId: (section: EditorSection) => string;
};

export function useEditorSections({
  form,
  initialSection,
  missingPhotos,
  sectionId,
}: UseEditorSectionsOptions) {
  const { t } = useTranslation('myListings');
  const firstSection = initialSection ?? 'details';
  const [openSections, setOpenSections] = useState<EditorSection[]>([firstSection]);
  const [visited, setVisited] = useState<readonly EditorSection[]>([firstSection]);
  const [checked, setChecked] = useState<readonly EditorSection[]>([]);
  const [hasMarkedErrors, setHasMarkedErrors] = useState(false);
  const { errors } = form.formState;

  const sectionStatus = (section: EditorSection): SectionStatus => {
    if (section === 'contact') {
      return undefined;
    }
    if (section === 'extras') {
      const invalid = SECTION_FIELDS.extras.filter((field) => errors[field]).length;
      return invalid > 0
        ? { tone: 'error', label: t('sections.missing', { count: invalid }) }
        : undefined;
    }
    if (section === 'photos') {
      if (missingPhotos === 0) {
        return { tone: 'success', label: t('sections.complete') };
      }
      return checked.includes('photos')
        ? { tone: 'error', label: t('sections.photosMissing', { count: missingPhotos }) }
        : undefined;
    }
    const missing = SECTION_FIELDS[section].filter((field) => errors[field]).length;
    if (missing > 0) {
      return { tone: 'error', label: t('sections.missing', { count: missing }) };
    }
    return checked.includes(section)
      ? { tone: 'success', label: t('sections.complete') }
      : undefined;
  };

  const checkSections = async (sections: readonly EditorSection[]) => {
    const fields = fieldsOf(sections);
    if (fields.length > 0) {
      await form.trigger(fields);
    }
    setChecked((current) => union(current, sections));
  };

  const handleOpenChange = (values: string[]) => {
    const next = values.filter(isEditorSection);
    const opened = next.filter((section) => !openSections.includes(section));
    void checkSections(visited.filter((section) => !opened.includes(section)));
    setVisited((current) => union(current, next));
    setOpenSections(next);
  };

  const revealErrors = (sections: readonly EditorSection[], fields: readonly string[]) => {
    const [first] = sections;
    if (!first) {
      return;
    }
    flushSync(() => {
      setOpenSections((current) => union(current, sections));
      setVisited((current) => union(current, sections));
      setChecked((current) => union(current, sections));
      setHasMarkedErrors(true);
    });
    const field = fieldsOf(EDITOR_SECTIONS).find((name) => fields.includes(name));
    if (field) {
      form.setFocus(field);
    }
    const element = document.getElementById(sectionId(first));
    if (element && !element.contains(document.activeElement)) {
      element.scrollIntoView({ block: 'start' });
    }
  };

  const revealInvalidSections = (fields: readonly string[]) => {
    const sections = sectionsWithErrors(fields);
    const withPhotos = missingPhotos > 0 ? union(sections, ['photos']) : sections;
    const ordered = EDITOR_SECTIONS.filter((section) => withPhotos.includes(section));
    revealErrors(ordered, fields);
    return ordered.length === 0;
  };

  return {
    openSections,
    hasMarkedErrors,
    clearMarkedErrors: () => {
      setHasMarkedErrors(false);
    },
    sectionStatus,
    handleOpenChange,
    revealErrors,
    revealInvalidSections,
  };
}
