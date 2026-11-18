import type { ChapterBuilder } from '../chapter.ts';
import { chapter, chapterHead, missingSection } from '../components.ts';
import { esc, formatNumber } from '../format.ts';
import { CITY_NAMES, SEISMIC_LEVELS } from '../labels.ts';
import type { ReportData } from '../report-data.ts';

type Seismic = NonNullable<ReportData['sections']['seismic']>;

const CONCLUSIONS: Record<string, { title: string; body: string }> = {
  low: {
    title: 'Pe scurt: risc scăzut',
    body: 'Codul seismic cere aici cea mai mică accelerație de proiectare din țară. Contează în continuare cât de bine e construit și întreținut blocul.',
  },
  moderate: {
    title: 'Pe scurt: risc moderat, nu ridicat',
    body: 'Zona e la mijlocul scalei din codul seismic. Cutremurele mari ale țării vin din Vrancea și ajung aici slăbite. Contează mai departe cât de bine e construit și întreținut blocul.',
  },
  high: {
    title: 'Pe scurt: risc ridicat',
    body: 'Zona e în partea de sus a scalei din codul seismic. Cere anul construcției, expertiza tehnică și dacă blocul a fost consolidat.',
  },
  very_high: {
    title: 'Pe scurt: risc foarte ridicat',
    body: 'Zona are cea mai mare accelerație de proiectare din codul seismic. Cere anul construcției, expertiza tehnică, clasa de risc seismic și dacă blocul a fost consolidat.',
  },
};

function acceleration(value: number): string {
  return `${formatNumber(value, 2)} g`;
}

function comparison(seismic: Seismic, citySlug: string): string {
  const values = [...new Set(seismic.comparison.map((city) => city.ag_g))].sort(
    (left, right) => left - right,
  );
  const lowest = values[0];
  const highest = values.at(-1);
  if (lowest === undefined || highest === undefined || values.length < 2) return '';
  const stops = values.map((value) => {
    const cities = seismic.comparison
      .filter((city) => city.ag_g === value)
      .map((city) => CITY_NAMES[city.slug] ?? city.slug);
    const isHere = seismic.comparison.some((city) => city.slug === citySlug && city.ag_g === value);
    const left = ((value - lowest) / (highest - lowest)) * 100;
    return `<div class="scale-stop${isHere ? ' here' : ''}" style="left:${left.toFixed(1)}%"><b>${acceleration(value)}</b><i></i>${esc(cities.join(', '))}</div>`;
  });
  return `<div class="scale"><div class="scale-track"></div>${stops.join('')}</div>`;
}

export const seismicChapter: ChapterBuilder = (report) => {
  const seismic = report.sections.seismic;
  const eyebrow = 'Risc seismic · context, nu intră în scor';
  if (!seismic) {
    return {
      html: chapter(
        chapterHead({ eyebrow, title: 'Riscul seismic al zonei' }) +
          missingSection('Nu avem valoarea din codul seismic pentru această adresă.'),
      ),
      maps: [],
    };
  }
  const level = seismic.level ?? 'moderate';
  const levelLabel = SEISMIC_LEVELS[level] ?? level;
  const conclusion = CONCLUSIONS[level] ?? CONCLUSIONS.moderate;
  const building = seismic.building
    ? `<p class="note">Anul declarat al construcției: ${String(seismic.building.construction_year)}. Întreabă după ce normativ a fost proiectat blocul și dacă are expertiză tehnică.</p>`
    : '';
  const head = chapterHead({
    eyebrow,
    precision: seismic.precision === 'address' ? 'zona adresei' : 'oraș',
    title: `Accelerația de proiectare e ${acceleration(seismic.ag_g)}: nivel ${levelLabel.toLocaleLowerCase('ro-RO')}`,
    lead: `Valoarea vine din codul seismic ${seismic.code} și arată pentru ce cutremur se proiectează clădirile din ${report.city.name}.`,
  });
  const scale = comparison(seismic, report.city.slug);
  return {
    html: chapter(
      head +
        `<section class="card"><div class="score-card"><div><p class="eyebrow">Seismic</p><div class="big" style="color:#7A5234">${formatNumber(seismic.ag_g, 2)}<small> g</small></div><span class="pill" style="background:#F6E9DC;color:#7A5234">${esc(levelLabel)}</span></div><div><h4>Cum stă ${esc(report.city.name)} față de celelalte orașe</h4>${scale}</div></div><div class="scope"><span class="yes"><b>Ține cont de</b> accelerația de proiectare din codul seismic</span><span class="no"><b>Nu ține cont de</b> starea clădirii și de consolidări</span></div></section>` +
        (conclusion
          ? `<div class="callout"><b>${esc(conclusion.title)}</b>${esc(conclusion.body)}</div>`
          : '') +
        building,
    ),
    maps: [],
  };
};
