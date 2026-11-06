import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';
import { formatNumber, formatPrice, toCurrency } from '@/i18n/format';
import { REVIEW_CHECKS, type ReviewCheck, type ReviewChecks } from '../moderation.checks';
import type { ReviewListing } from '../moderation.types';
import { pricePerSquareMeter } from '../moderation.utils';

type ReviewChecklistProps = {
  listing: ReviewListing;
  checks: ReviewChecks;
  onCheckedChange: (check: ReviewCheck, isChecked: boolean) => void;
};

export function ReviewChecklist({ listing, checks, onCheckedChange }: ReviewChecklistProps) {
  const { t } = useTranslation('moderation');
  const headingId = useId();
  const idPrefix = useId();
  const done = REVIEW_CHECKS.filter((check) => checks[check]).length;
  const perSquareMeter = pricePerSquareMeter(listing.price, listing.area_m2);
  const descriptions: Partial<Record<ReviewCheck, string>> = {
    photos: t('checklist.photos.description', { count: listing.photos.length }),
    price:
      perSquareMeter === null
        ? undefined
        : t('checklist.price.description', {
            value: formatPrice(perSquareMeter, toCurrency(listing.currency)),
          }),
  };

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4.5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-body font-bold text-foreground">
          {t('checklist.title')}
        </h2>
        <span className="text-meta text-muted-foreground tabular-nums">
          {t('checklist.progress', {
            done: formatNumber(done),
            total: formatNumber(REVIEW_CHECKS.length),
          })}
        </span>
      </div>
      <div
        role="progressbar"
        aria-labelledby={headingId}
        aria-valuemin={0}
        aria-valuemax={REVIEW_CHECKS.length}
        aria-valuenow={done}
        className="h-1 overflow-hidden rounded-full bg-surface-alt"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-(--duration-base)"
          style={{ width: `${String((done / REVIEW_CHECKS.length) * 100)}%` }}
        />
      </div>
      <ul className="flex flex-col gap-1">
        {REVIEW_CHECKS.map((check) => {
          const id = `${idPrefix}-${check}`;
          const description = descriptions[check];
          return (
            <li key={check}>
              <Field orientation="horizontal" className="items-start gap-3 py-2.5">
                <Checkbox
                  id={id}
                  checked={checks[check]}
                  onCheckedChange={(state) => {
                    onCheckedChange(check, state === true);
                  }}
                />
                <FieldContent className="gap-0">
                  <FieldLabel htmlFor={id} className="text-body-sm leading-compact font-normal">
                    {t(`checklist.${check}.label`)}
                  </FieldLabel>
                  {description ? (
                    <FieldDescription className="text-small leading-compact">
                      {description}
                    </FieldDescription>
                  ) : null}
                </FieldContent>
              </Field>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
