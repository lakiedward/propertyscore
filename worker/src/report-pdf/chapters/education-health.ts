import type { ChapterBuilder } from '../chapter.ts';
import { card, chapter, chapterHead, note, rows, scoreCard, type Row } from '../components.ts';
import { formatMinutes } from '../format.ts';
import { EDUCATION_LEVELS, HEALTH_LAYERS } from '../labels.ts';
import type { ReportData } from '../report-data.ts';

function schoolRows(report: ReportData): Row[] {
  const education = report.sections.education;
  return (education?.levels ?? []).map((level) => ({
    title: EDUCATION_LEVELS[level.key] ?? level.key,
    detail:
      education?.institutions.find((institution) => institution.levels.includes(level.key))?.name ??
      undefined,
    value: level.nearest_min === null ? '–' : formatMinutes(level.nearest_min),
    unit: level.nearest_min === null ? undefined : 'pe jos',
  }));
}

function healthRows(report: ReportData): Row[] {
  return (report.sections.health?.layers ?? []).map((layer) => ({
    title: HEALTH_LAYERS[layer.key] ?? layer.key,
    detail: layer.place?.name ?? undefined,
    value: layer.minutes === null ? '–' : formatMinutes(layer.minutes),
    unit: layer.minutes === null ? undefined : layer.mode === 'car' ? 'cu mașina' : 'pe jos',
  }));
}

function list(title: string, eyebrow: string, items: readonly Row[]): string {
  return card(
    title,
    items.length === 0 ? note('Fără date pentru această adresă.') : rows(items),
    eyebrow,
  );
}

function scoreText(label: string, score: number | null): string {
  return score === null ? `${label} · fără date` : `${label} · ${String(Math.round(score))} / 100`;
}

export const educationHealthChapter: ChapterBuilder = (report) => {
  const education = report.categories.education.score;
  const health = report.categories.health.score;
  const head = chapterHead({
    eyebrow: `${scoreText('Educație', education)}   ${scoreText('Sănătate', health)}`,
    precision: 'adresă',
    title: 'Școlile și serviciile medicale la care ajungi cel mai repede',
    lead: 'Cel mai apropiat loc de fiecare fel, cu timpul de la adresă.',
  });
  return {
    html: chapter(
      head +
        `<div class="grid cols-2">${list('Cea mai apropiată, pe niveluri', 'Educație', schoolRows(report))}${list('Serviciile medicale cele mai apropiate', 'Sănătate', healthRows(report))}</div>` +
        scoreCard('education', report, { label: 'Educație' }) +
        scoreCard('health', report, { label: 'Sănătate' }),
    ),
    maps: [],
  };
};
