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
  'judet',
  'cartier',
  'valoare_mediana',
  'unitate',
  'p25_eur_mp',
  'p75_eur_mp',
  'pret_median_eur',
  'suprafata_mediana_mp',
  'oferte',
] as const;

const CATEGORIES: Record<string, 'sale' | 'rent'> = {
  'apartamente-de-vanzare': 'sale',
  'apartamente-de-inchiriat': 'rent',
};

const UNITS: Record<'sale' | 'rent', string> = { sale: 'EUR/mp', rent: 'EUR/luna' };

const NEARBY_LOCALITIES: Record<string, readonly string[]> = {
  timisoara: ['timis/dumbravita', 'timis/giroc', 'timis/mosnita-noua', 'timis/ghiroda'],
  sibiu: ['sibiu/selimbar', 'sibiu/cristian', 'sibiu/cisnadie', 'sibiu/sura-mica'],
};

const CEDILLA_LETTERS: Record<string, string> = { ş: 'ș', Ş: 'Ș', ţ: 'ț', Ţ: 'Ț' };

function withCommaLetters(name: string): string {
  return name.replace(/[şŞţŢ]/g, (letter) => CEDILLA_LETTERS[letter] ?? letter);
}

type Place = { city: string; locality: { slug: string; name: string } | null };

function findPlace(
  raw: { oras: string; judet: string },
  slugByName: ReadonlyMap<string, string>,
): Place | null {
  const name = placeKey(raw.oras);
  const city = slugByName.get(name);
  if (city !== undefined) return { city, locality: null };
  const key = `${placeKey(raw.judet)}/${name}`;
  for (const slug of slugByName.values()) {
    if (NEARBY_LOCALITIES[slug]?.includes(key)) {
      return { city: slug, locality: { slug: name, name: withCommaLetters(raw.oras) } };
    }
  }
  return null;
}

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
    const place = findPlace(raw, slugByName);
    const transaction = CATEGORIES[placeKey(raw.categorie)];
    if (place === null || transaction === undefined) continue;
    const median = parsePositiveNumber(raw.valoare_mediana);
    if (raw.perioada !== period.slice(0, 7) || raw.unitate !== UNITS[transaction]) {
      skipped += 1;
      continue;
    }
    const p25 = parsePositiveNumber(raw.p25_eur_mp);
    const p75 = parsePositiveNumber(raw.p75_eur_mp);
    const hasInterval = transaction === 'sale' && p25 !== null && p75 !== null;
    const neighbourhood = placeKey(raw.cartier);
    if (place.locality !== null && neighbourhood !== '') continue;
    const zone =
      place.locality ?? (neighbourhood === '' ? null : { slug: neighbourhood, name: raw.cartier });
    rows.push({
      city: place.city,
      zone_slug: zone?.slug ?? null,
      zone_name: zone?.name ?? null,
      is_nearby_locality: place.locality !== null,
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
      median_area_m2: parsePositiveNumber(raw.suprafata_mediana_mp),
      source_url: IMOSPOT_INDEX_URL,
    });
  }
  if (total === 0) {
    throw new WorkerError('source_layout_changed', 'The Imospot index file has no rows');
  }
  return { rows, skipped };
}
