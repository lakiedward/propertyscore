import { getRouteApi } from '@tanstack/react-router';
import { PenLineIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/i18n/format';
import { oneOf } from '@/lib/utils';
import { versionLabel } from '@/lib/version-label';
import { useStartInspection } from '../api/field-inspection.queries';
import { SIGNER_LANGUAGES, type SignerLanguage, type Workspace } from '../field-inspection.types';
import { canStartAt } from '../field-inspection.utils';
import { ConsentSection } from './consent-section';
import { SignaturePad } from './signature-pad';

const route = getRouteApi('/_authenticated/field/inspections/$inspectionId');

const TIME = { hour: '2-digit', minute: '2-digit' } as const;

type ConsentStepProps = {
  workspace: Workspace;
  firstSection: string | undefined;
};

export function ConsentStep({ workspace, firstSection }: ConsentStepProps) {
  const { t } = useTranslation('fieldInspection');
  const navigate = route.useNavigate();
  const signerTitleId = useId();
  const { inspection, sections, consent } = workspace;
  const isSigned = consent !== null;
  const [language, setLanguage] = useState<SignerLanguage>(
    oneOf(SIGNER_LANGUAGES, consent?.language ?? '') ?? 'ro',
  );
  const [checked, setChecked] = useState<ReadonlySet<string>>(
    () => new Set(isSigned ? sections.map((section) => section.id) : []),
  );
  const [signature, setSignature] = useState<Blob | null>(null);
  const start = useStartInspection(inspection.id);
  const isStartable = canStartAt(inspection.starts_at, new Date());
  const missingChecks = sections.length - checked.size;
  const missing = [
    missingChecks > 0 ? t('consent.missingChecks', { count: missingChecks }) : null,
    signature ? null : t('consent.missingSignature'),
  ].filter((item): item is string => item !== null);
  const canSign = !isSigned && missing.length === 0 && isStartable && !start.isPending;
  const signedAt = consent ? formatDate(consent.signed_at, TIME) : null;

  return (
    <div className="grid grid-cols-1 items-start gap-4 @3xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-title-xs leading-tight font-extrabold">{t('consent.title')}</h2>
          <ToggleGroup
            type="single"
            value={language}
            onValueChange={(value) => {
              const next = oneOf(SIGNER_LANGUAGES, value);
              if (next) {
                setLanguage(next);
              }
            }}
            aria-label={t('consent.languageLabel')}
            className="gap-0 rounded-md border border-border bg-card p-0.75"
          >
            {SIGNER_LANGUAGES.map((option) => (
              <ToggleGroupItem
                key={option}
                value={option}
                lang={option}
                className="touch-target h-8 min-w-12 rounded-[6px] px-3 text-caption font-bold text-brand data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {option.toUpperCase()}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        {sections.map((section, index) => {
          const isEnglish = language === 'en';
          return (
            <ConsentSection
              key={section.id}
              number={index + 1}
              language={language}
              title={isEnglish ? section.title_en : section.title_ro}
              text={isEnglish ? section.text_en : section.text_ro}
              checkLabel={isEnglish ? section.check_en : section.check_ro}
              meta={t('consent.version', {
                version:
                  workspace.consentVersion === null ? '' : versionLabel(workspace.consentVersion),
              })}
              isChecked={checked.has(section.id)}
              isDisabled={isSigned}
              onCheckedChange={(isChecked) => {
                setChecked((current) => {
                  const next = new Set(current);
                  if (isChecked) {
                    next.add(section.id);
                  } else {
                    next.delete(section.id);
                  }
                  return next;
                });
              }}
            />
          );
        })}
      </div>
      <section
        aria-labelledby={signerTitleId}
        className="flex flex-col gap-3 rounded-xl border border-card bg-card p-4.5 shadow-card-soft @3xl:sticky @3xl:top-4"
      >
        <h3 id={signerTitleId} className="text-base font-bold">
          {t('consent.signerTitle')}
        </h3>
        <dl className="grid grid-cols-[92px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-small">
          <dt className="text-muted-foreground">{t('consent.signer')}</dt>
          <dd className="font-semibold">{consent?.signer_name ?? inspection.access_name}</dd>
          <dt className="text-muted-foreground">{t('consent.phone')}</dt>
          <dd className="font-semibold tabular-nums">{inspection.access_phone}</dd>
          <dt className="text-muted-foreground">{t('consent.inspector')}</dt>
          <dd className="font-semibold">{inspection.inspector_name}</dd>
          <dt className="text-muted-foreground">{t('consent.date')}</dt>
          <dd className="font-semibold tabular-nums">
            {formatDate(consent?.signed_at ?? new Date(), {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </dd>
        </dl>
        {isSigned ? (
          <p role="status" className="text-small font-bold text-success">
            {t('consent.signedAt', { time: signedAt })}
          </p>
        ) : (
          <SignaturePad
            label={t('consent.signatureLabel')}
            areaLabel={t('consent.signatureArea')}
            placeholder={t('consent.signaturePlaceholder')}
            clearLabel={t('consent.clear')}
            signer={inspection.access_name}
            isDisabled={!isStartable}
            onChange={setSignature}
          />
        )}
        <Button
          type="button"
          variant="cta"
          className="w-full"
          disabled={!canSign}
          aria-busy={start.isPending}
          onClick={() => {
            if (!signature) {
              return;
            }
            start.mutate(
              {
                signature,
                signerName: inspection.access_name,
                language,
                sectionIds: [...checked],
              },
              {
                onSuccess: () => {
                  void navigate({ search: { section: firstSection } });
                },
              },
            );
          }}
        >
          <PenLineIcon aria-hidden />
          {isSigned
            ? t('consent.signedAt', { time: signedAt })
            : start.isPending
              ? t('consent.signing')
              : t('consent.sign')}
        </Button>
        <p className="text-center text-caption font-bold text-muted-foreground">
          {isSigned
            ? t('consent.signedNote')
            : !isStartable
              ? t('consent.notStartable')
              : missing.length > 0
                ? t('consent.missing', { items: missing.join(' + ') })
                : t('consent.ready')}
        </p>
      </section>
    </div>
  );
}
