import type { ChapterBuilder } from '../chapter.ts';
import { card, chapter, chapterHead } from '../components.ts';
import { esc, formatMonth, formatSourceDate } from '../format.ts';
import { SOURCE_LABELS } from '../labels.ts';

export const closingChapter: ChapterBuilder = (report) => {
  const sources = Object.entries(report.snapshot.sourceDates).map(
    ([key, value]) =>
      `<div>${esc(SOURCE_LABELS[key] ?? key)}<br><span>${esc(formatSourceDate(value))}</span></div>`,
  );
  const nextStep =
    '<section class="next-step"><div class="brand"><span>Property<b>Fizic</b></span><span>Pasul următor</span></div><p><b>Raportul descrie zona. Starea apartamentului o verifică un inspector,</b> la fața locului: întrebări, fotografii, plan și tur 360°.</p></section>';
  return {
    html: chapter(
      chapterHead({
        eyebrow: 'Surse și date',
        title: 'Aceeași adresă primește același scor, oricând o verifici',
        lead: 'Scorurile se calculează din coordonate, cu aceeași formulă pentru toate adresele. Unde nu avem date bune, îți spunem.',
      }) +
        card(
          `Date din ${formatMonth(report.snapshot.period)}`,
          sources.length === 0 ? '' : `<div class="sources">${sources.join('')}</div>`,
        ) +
        nextStep,
    ),
    maps: [],
  };
};
