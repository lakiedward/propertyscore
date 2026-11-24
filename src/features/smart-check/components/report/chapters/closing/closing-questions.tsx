import { ArrowRightIcon, CheckIcon, CopyIcon, PrinterIcon } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReportTab } from '../../../../report-chapter-meta';
import {
  VIEWING_QUESTION_TOPICS,
  questionListText,
  type ViewingQuestion,
} from '../../../../viewing-questions.utils';

const COLUMN_CLASSES = {
  1: 'w760:grid-cols-1',
  2: 'w760:grid-cols-2',
  3: 'w760:grid-cols-3',
} as const;

type ClosingQuestionsProps = {
  questions: readonly ViewingQuestion[];
  onOpenChapter: (tab: ReportTab) => void;
};

export function ClosingQuestions({ questions, onOpenChapter }: ClosingQuestionsProps) {
  const { t } = useTranslation('smartCheck');
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  if (questions.length === 0) return null;

  const toggle = (code: string) => {
    setDone((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleCopy = () => {
    const text = questionListText(
      questions.map((question) =>
        t(`report.chapters.closing.questions.items.${question.code}.question`),
      ),
    );
    navigator.clipboard.writeText(text).then(
      () => {
        toast.success(t('report.chapters.closing.questions.copied'));
      },
      () => {
        toast.error(t('report.chapters.closing.questions.copyFailed'));
      },
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const columns = Math.min(questions.length, 3) as 1 | 2 | 3;

  return (
    <section
      aria-labelledby="report-closing-questions"
      className="rounded-[28px] border border-border-subtle bg-muted p-4.5 shadow-report-card w560:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="text-meta font-extrabold tracking-label text-muted-foreground uppercase">
            {t('report.chapters.closing.questions.eyebrow')}
          </p>
          <h2
            id="report-closing-questions"
            className="mt-1.5 text-[clamp(24px,3vw,32px)] leading-[1.1] font-extrabold tracking-[-0.025em]"
          >
            {t('report.chapters.closing.questions.title', { count: questions.length })}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-live="polite"
            className="rounded-full bg-cta px-3 py-1.5 text-[13px] font-bold text-cta-foreground [&_strong]:font-extrabold"
          >
            <Trans
              t={t}
              i18nKey="report.chapters.closing.questions.progress"
              values={{ done: done.size, total: questions.length }}
              components={{ strong: <strong /> }}
            />
          </span>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            <CopyIcon aria-hidden />
            {t('report.chapters.closing.questions.copy')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="print:hidden"
          >
            <PrinterIcon aria-hidden />
            {t('report.chapters.closing.questions.print')}
          </Button>
        </div>
      </div>
      <ol
        aria-label={t('report.chapters.closing.questions.listLabel')}
        className={cn(
          'mt-5 grid list-none grid-cols-1 gap-3 p-0',
          COLUMN_CLASSES[columns],
          questions.length >= 5 && 'w1059:grid-cols-5',
        )}
      >
        {questions.map((question, index) => {
          const topic = VIEWING_QUESTION_TOPICS[question.topic];
          const isDone = done.has(question.code);
          const topicLabel = t(`report.chapters.closing.questions.topics.${question.topic}`);
          const chapter = topic.chapter;
          return (
            <li
              key={question.code}
              style={{ '--cc': topic.color, '--cb': topic.surface } as CSSProperties}
              className="flex min-w-0 flex-col gap-2.5 rounded-[14px] border border-border bg-card p-4.5 shadow-[inset_0_3px_0_var(--cc)]"
            >
              <label className="group/q flex cursor-pointer items-start">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => {
                    toggle(question.code);
                  }}
                  aria-label={t('report.chapters.closing.questions.check', { number: index + 1 })}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="grid size-7 place-items-center rounded-full bg-primary text-[13px] font-extrabold text-primary-foreground transition-colors peer-checked:bg-cta peer-checked:text-cta-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring"
                >
                  {isDone ? <CheckIcon className="size-4" /> : index + 1}
                </span>
              </label>
              <b
                className={cn(
                  'text-[15.5px] leading-[1.35]',
                  isDone && 'text-muted-foreground line-through decoration-primary/35',
                )}
              >
                {t(`report.chapters.closing.questions.items.${question.code}.question`)}
              </b>
              <small className="text-[13px] leading-[1.45] text-muted-foreground">
                {t(`report.chapters.closing.questions.items.${question.code}.why`)}
              </small>
              {chapter ? (
                <button
                  type="button"
                  aria-label={t('report.chapters.closing.questions.openChapter', {
                    topic: topicLabel,
                  })}
                  onClick={() => {
                    onOpenChapter(chapter);
                  }}
                  className="mt-auto inline-flex items-center gap-1.5 self-start rounded-full bg-(--cb) px-2.5 py-1 text-[12px] font-bold text-(--cc) focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {topicLabel}
                  <ArrowRightIcon aria-hidden className="size-3.5" />
                </button>
              ) : (
                <span className="mt-auto inline-flex items-center self-start rounded-full bg-(--cb) px-2.5 py-1 text-[12px] font-bold text-(--cc)">
                  {topicLabel}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
