import { esc } from '../format.ts';
import { VIEWING_QUESTIONS } from '../labels.ts';
import type { ReportData } from '../report-data.ts';

const MAX_COLUMNS = 3;

export function viewingQuestions(report: ReportData): string {
  const questions = (report.sections.questions?.codes ?? []).flatMap((code) => {
    const question = VIEWING_QUESTIONS[code];
    return question === undefined ? [] : [question];
  });
  if (questions.length === 0) return '';
  const cards = questions
    .map(
      (question, index) =>
        `<li class="bB-q" style="--cc:${question.color};--cb:${question.tint}"><span class="ck"><span class="n">${String(index + 1)}</span></span><b>${esc(question.question)}</b><small>${esc(question.why)}</small><span class="chap">${esc(question.topic)}</span></li>`,
    )
    .join('');
  const columns = Math.min(questions.length, MAX_COLUMNS);
  const count = questions.length === 1 ? 'O întrebare' : `${String(questions.length)} întrebări`;
  return `<section class="bB-ask"><div class="eyebrow">De întrebat la vizionare</div><h2>${count} pentru proprietar</h2><ol class="bB-qs" style="--cols:${String(columns)}">${cards}</ol></section>`;
}
