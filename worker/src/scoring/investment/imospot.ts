import { WorkerError } from '../../lib/errors.ts';
import { readCsvObjects } from '../../sources/csv.ts';
import {
  parsePositiveNumber,
  placeKey,
  type AreaStatisticRow,
  type CoveredCity,
} from './area-statistics.ts';

export const IMOSPOT_ORIGIN = 'https://www.imospot.ro';

const IMOSPOT_INDEX_URL = `${IMOSPOT_ORIGIN}/indicele-imospot`;

export const IMOSPOT_INDEX_PATHS: readonly RegExp[] = [/^\/indicele-imospot\/\d{4}-\d{2}\.csv$/];

export function imospotIndexCsvPath(period: string): string {
  return `/indicele-imospot/${period.slice(0, 7)}.csv`;
}

const IMOSPOT_CSV_COLUMNS = [
  'perioada',
  'categorie',
  'oras',
  'cartier',
  'valoare_mediana',
  'unitate',
  'p25_eur_mp',
  'p75_eur_mp',
  'pret_median_eur',
  'oferte',
] as const;

const CATEGORIES: Record<string, 'sale' | 'rent'> = {
  'apartamente-de-vanzare': 'sale',
  'apartamente-de-inchiriat': 'rent',
};

const UNITS: Record<'sale' | 'rent', string> = { sale: 'EUR/mp', rent: 'EUR/luna' };

export type ImospotIndexResult = { rows: AreaStatisticRow[]; skipped: number };

export async function parseImospotIndexCsv(
  text: string,
  period: string,
  cities: readonly CoveredCity[],
): Promise<ImospotIndexResult> {
  const slugByName = new Map(cities.map((city) => [placeKey(city.name), city.slug]));
  const rows: AreaStatisticRow[] = [];
  let skipped = 0;
  let total = 0;
  for await (const raw of readCsvObjects([text], IMOSPOT_CSV_COLUMNS, 'Imospot index')) {
    total += 1;
    const city = slugByName.get(placeKey(raw.oras));
    const transaction = CATEGORIES[placeKey(raw.categorie)];
    if (city === undefined || transaction === undefined) continue;
    const median = parsePositiveNumber(raw.valoare_mediana);
    if (raw.perioada !== period.slice(0, 7) || raw.unitate !== UNITS[transaction]) {
      skipped += 1;
      continue;
    }
    const p25 = parsePositiveNumber(raw.p25_eur_mp);
    const p75 = parsePositiveNumber(raw.p75_eur_mp);
    const hasInterval = transaction === 'sale' && p25 !== null && p75 !== null;
    const zoneSlug = placeKey(raw.cartier);
    rows.push({
      city,
      zone_slug: zoneSlug === '' ? null : zoneSlug,
      zone_name: zoneSlug === '' ? null : raw.cartier,
      transaction,
      property_type: 'apartment',
      rooms_min: null,
      rooms_max: null,
      observed_on: null,
      listing_count: parsePositiveNumber(raw.oferte),
      apartment_count: null,
      median_eur: transaction === 'sale' ? parsePositiveNumber(raw.pret_median_eur) : median,
      p25_eur: null,
      p75_eur: null,
      median_eur_m2: transaction === 'sale' ? median : null,
      p25_eur_m2: hasInterval ? p25 : null,
      p75_eur_m2: hasInterval ? p75 : null,
      source_url: IMOSPOT_INDEX_URL,
    });
  }
  if (total === 0) {
    throw new WorkerError('source_layout_changed', 'The Imospot index file has no rows');
  }
  return { rows, skipped };
}
