import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import type { SectionStatus } from '../hooks/use-editor-sections';
import type { EditorSection } from '../listing-editor.sections';

type EditorSectionTitleProps = {
  section: EditorSection;
  isRequired: boolean;
  status: SectionStatus;
};

export function EditorSectionTitle({ section, isRequired, status }: EditorSectionTitleProps) {
  const { t } = useTranslation('myListings');

  return (
    <span className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
      <span>
        {t(`sections.${section}`)}
        {section === 'extras' ? (
          <span className="text-body-sm font-semibold text-muted-foreground">
            {' '}
            {t('sections.optionalTag')}
          </span>
        ) : null}
        {isRequired ? (
          <>
            <span aria-hidden className="text-destructive">
              {' *'}
            </span>
            <span className="sr-only">{t('sections.required')}</span>
          </>
        ) : null}
      </span>
      {status ? <StatusPill tone={status.tone} label={status.label} /> : null}
    </span>
  );
}
