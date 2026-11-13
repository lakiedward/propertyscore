import { PhotoMosaic } from '@/components/media/photo-mosaic';
import type { ListingSummaryContent } from '@/hooks/use-listing-summary';
import { FactChip } from './fact-chip';

type ListingSummaryProps = {
  content: ListingSummaryContent;
  titleId?: string;
};

export function ListingSummary({ content, titleId }: ListingSummaryProps) {
  return (
    <>
      <PhotoMosaic
        photos={content.photos}
        moreLabel={content.moreLabel}
        emptyLabel={content.emptyLabel}
      />
      <div className="flex flex-col gap-4 px-5.5 pt-4.5">
        <div className="flex flex-col gap-1">
          <p className="text-meta text-muted-foreground">{content.eyebrow}</p>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2
              id={titleId}
              className="min-w-0 text-h3 font-extrabold tracking-[-0.02em] text-foreground"
            >
              {content.title}
            </h2>
            <p className="text-h3 font-extrabold tracking-[-0.02em] text-foreground tabular-nums">
              {content.price}
            </p>
          </div>
        </div>
        <ul className="flex flex-wrap gap-2">
          {content.facts.map((fact) => (
            <li key={fact.key}>
              <FactChip icon={fact.icon} label={fact.label} />
            </li>
          ))}
        </ul>
        {content.details.length > 0 ? (
          <section aria-label={content.detailsHeading} className="flex flex-col gap-2">
            <h3 className="text-label font-bold text-foreground">{content.detailsHeading}</h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {content.details.map((detail) => (
                <div
                  key={detail.key}
                  className="flex flex-col gap-0.5 border-b border-border-subtle pb-2"
                >
                  <dt className="text-meta text-muted-foreground">{detail.label}</dt>
                  <dd className="text-body-sm font-semibold text-foreground">{detail.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
        {content.description ? (
          <p className="text-body-sm leading-[1.6] whitespace-pre-line text-foreground">
            {content.description}
          </p>
        ) : null}
      </div>
    </>
  );
}
