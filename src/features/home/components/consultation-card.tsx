import {
  ArrowRightIcon,
  BookOpenIcon,
  CircleDollarSignIcon,
  MapIcon,
  MessageSquareIcon,
  SquareCheckIcon,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Trans, useTranslation } from 'react-i18next';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { SectionTitle } from './section-title';

const CONSULTATION_LENGTHS = ['short', 'long'] as const;

const TOPICS = [
  { id: 'report', icon: BookOpenIcon },
  { id: 'viewing', icon: SquareCheckIcon },
  { id: 'negotiation', icon: CircleDollarSignIcon },
  { id: 'zones', icon: MapIcon },
] as const;

export function ConsultationCard() {
  const { t } = useTranslation('home');

  return (
    <div className="mt-7 grid grid-cols-1 items-center gap-10 rounded-xl bg-surface-aqua p-6 w860:p-10 w1080:grid-cols-[0.91fr_1fr]">
      <div className="flex flex-col items-start gap-2.5">
        <p className="flex items-center gap-1.5 text-meta font-extrabold tracking-[0.08em] text-aqua-ink uppercase">
          <MessageSquareIcon aria-hidden className="size-4" />
          {t('pricing.consultation.eyebrow')}
        </p>
        <SectionTitle
          as="h3"
          size="card"
          className="text-brand"
          accentClassName="text-aqua-strong"
          lead={t('pricing.consultation.titleLead')}
          accent={t('pricing.consultation.titleAccent')}
        />
        <p className="text-body text-muted-foreground">{t('pricing.consultation.text')}</p>
        <ul className="mt-1.5 mb-2 flex flex-wrap gap-2">
          {CONSULTATION_LENGTHS.map((key) => (
            <li key={key} className="rounded-full bg-card px-3.5 py-1.5 text-small text-aqua-ink">
              <Trans
                t={t}
                i18nKey={`pricing.consultation.${key}`}
                components={{ strong: <strong className="font-bold" /> }}
              />
            </li>
          ))}
        </ul>
        <Link
          to="/"
          hash={HOME_SECTION.questions}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-md bg-primary px-5 text-label font-extrabold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-aqua focus-visible:outline-none sm:w-auto"
        >
          {t('pricing.consultation.cta')}
          <ArrowRightIcon aria-hidden className="size-4" />
        </Link>
      </div>
      <div className="rounded-xl bg-card px-6 py-2 shadow-aqua">
        <p className="pt-4 pb-1.5 text-meta font-extrabold tracking-[0.08em] text-muted-foreground uppercase">
          {t('pricing.consultation.topicsTitle')}
        </p>
        <ul>
          {TOPICS.map((topic) => {
            const Icon = topic.icon;
            return (
              <li
                key={topic.id}
                className="flex items-center gap-3.5 border-t border-border-subtle py-4.5 first:border-t-0"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-icon bg-surface-aqua text-aqua-ink">
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="flex flex-col">
                  <span className="text-label font-extrabold text-brand">
                    {t(`pricing.consultation.topics.${topic.id}.title`)}
                  </span>
                  <span className="text-small text-muted-foreground">
                    {t(`pricing.consultation.topics.${topic.id}.text`)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
