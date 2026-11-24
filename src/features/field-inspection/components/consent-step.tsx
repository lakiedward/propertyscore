import { getRouteApi } from '@tanstack/react-router';
import { PenLineIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SegmentedControl } from '@/components/forms/segmented-control';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/i18n/format';
import { localizedText } from '@/i18n/localized';
import { canStartAt } from '@/lib/bucharest-time';
import { oneOf } from '@/lib/utils';
import { versionLabel } from '@/lib/version-label';
import { useStartInspection } from '../api/field-inspection.queries';
import { SIGNER_LANGUAGES, type SignerLanguage, type Workspace } from '../field-inspection.types';
import { ConsentSection } from './consent-section';
import { SignaturePad } from './signature-pad';

const route = getRouteApi('/_authenticated/field/inspections/$inspectionId');

const TIME = { hour: '2-digit', minute: '2-digit' } as const;

const CLOCK_TICK_MS = 30_000;

type ConsentStepProps = {
  workspace: Workspace;
  firstSection: string | undefined;
};

export function ConsentStep({ workspace, firstSection }: ConsentStepProps) {
  const { t } = useTranslation('fieldInspection');
  const { t: tCommon } = useTranslation('common');
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
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, CLOCK_TICK_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  const isStartable = canStartAt(inspection.starts_at, now);
  const missingChecks = sections.length - checked.size;
  const missingText =
    missingChecks > 0 && !signature
      ? t('consent.missingBoth', { count: missingChecks })
      : missingChecks > 0
        ? t('consent.missingChecks', { count: missingChecks })
        : signature
          ? null
          : t('consent.missingSignature');
  const canSign = !isSigned && missingText === null && isStartable && !start.isPending;
  const signedAt = consent ? formatDate(consent.signed_at, TIME) : null;

  return (
    <div className="grid grid-cols-1 items-start gap-4 @3xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-title-xs leading-tight font-extrabold">{t('consent.title')}</h2>
          <SegmentedControl
            ariaLabel={t('consent.languageLabel')}
            value={language}
            onChange={setLanguage}
            size="md"
            options={SIGNER_LANGUAGES.map((option) => ({
              value: option,
              label: tCommon(`language.short.${option}`),
              lang: option,
            }))}
          />
        </div>
        {sections.map((section, index) => {
          return (
            <ConsentSection
              key={section.id}
              number={index + 1}
              language={language}
              title={localizedText(section.title_ro, section.title_en, language)}
              text={localizedText(section.text_ro, section.text_en, language)}
              checkLabel={localizedText(section.check_ro, section.check_en, language)}
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
              : (missingText ?? t('consent.ready'))}
        </p>
      </section>
    </div>
  );
}
