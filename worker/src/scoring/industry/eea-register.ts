import { readCsvObjects } from '../../sources/csv.ts';
import {
  isTopEmitter,
  topEmitterThresholds,
  type IndustryParams,
  type SectorCode,
} from './industry.formula.ts';

export const EEA_FILES = {
  air: 'F1_4_Air_Releases_Facilities.csv',
  water: 'F2_4_Water_Releases_Facilities.csv',
  installations: 'F6_1_IED_Installations.csv',
} as const;

export const RELEASE_COLUMNS = [
  'countryName',
  'reportingYear',
  'EPRTRAnnexIMainActivity',
  'FacilityInspireId',
  'facilityName',
  'Longitude',
  'Latitude',
  'Pollutant',
  'Releases',
] as const;

export const INSTALLATION_COLUMNS = [
  'CountryName',
  'reportingYear',
  'parent_facilityInspireId',
  'EPRTRAnnexIMainActivity',
  'installationName',
  'Longitude',
  'Latitude',
  'installationStatus',
  'IEDAnnexIMainActivity',
] as const;

export type ReleaseRow = Record<(typeof RELEASE_COLUMNS)[number], string>;
export type InstallationRow = Record<(typeof INSTALLATION_COLUMNS)[number], string>;

export type RegisterSite = {
  sourceFacilityId: string;
  reportingYear: number;
  name: string;
  longitude: number;
  latitude: number;
  sectorCode: SectorCode;
  mainActivityCode: string;
  impactCodes: string[];
  airReleases: Record<string, number>;
  isTopEmitter: boolean;
};

const CLOSED_STATUSES = new Set(['disused', 'decommissioned']);

const POLLUTANT_CODES: Readonly<Record<string, string>> = {
  'Ammonia (NH3)': 'nh3',
  'Nitrogen oxides (NOX)': 'nox',
  'Sulphur oxides (SOX)': 'sox',
  'Particulate matter (PM10)': 'pm10',
  'Fine particulate matter (PM2.5)': 'pm2_5',
  'Non-methane volatile organic compounds (NMVOC)': 'nmvoc',
  'Carbon monoxide (CO)': 'co',
  'Carbon dioxide (CO2)': 'co2',
  'Carbon dioxide (CO2) excluding biomass': 'co2_excl_biomass',
  'Methane (CH4)': 'ch4',
  'Nitrous oxide (N2O)': 'n2o',
  'PCDD + PCDF (dioxins + furans) (as Teq)': 'pcdd_pcdf',
  Benzene: 'benzene',
  'Mercury and compounds (as Hg)': 'hg',
  'Lead and compounds (as Pb)': 'pb',
  'Cadmium and compounds (as Cd)': 'cd',
  'Arsenic and compounds (as As)': 'as',
  'Nickel and compounds (as Ni)': 'ni',
  'Chromium and compounds (as Cr)': 'cr',
  'Zinc and compounds (as Zn)': 'zn',
  'Copper and compounds (as Cu)': 'cu',
  'Polycyclic aromatic hydrocarbons (PAHs)': 'pah',
  'Chlorine and inorganic compounds (as HCl)': 'hcl',
  'Fluorine and inorganic compounds (as HF)': 'hf',
};

const EPRTR_SECTORS: Readonly<Record<string, SectorCode>> = {
  '1': 'energy',
  '2': 'metals',
  '3': 'minerals',
  '4': 'chemicals',
  '5': 'waste_water',
  '6': 'paper_wood',
  '7': 'livestock',
  '8': 'food',
  '9': 'other',
};

const IED_SECTORS: readonly (readonly [string, SectorCode])[] = [
  ['6.1', 'paper_wood'],
  ['6.4', 'food'],
  ['6.5', 'waste_water'],
  ['6.6', 'livestock'],
  ['6.', 'other'],
  ['1.', 'energy'],
  ['2.', 'metals'],
  ['3.', 'minerals'],
  ['4.', 'chemicals'],
  ['5.', 'waste_water'],
];

export function pollutantCode(name: string): string | null {
  const known = POLLUTANT_CODES[name];
  if (known) return known;
  if (name === '' || name.toUpperCase() === 'CONFIDENTIAL') return null;
  const inParentheses = /\(([^()]+)\)\s*$/.exec(name)?.[1] ?? name;
  const slug = inParentheses
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug === '' ? null : slug.slice(0, 40);
}

export function sectorFromActivity(eprtrActivity: string, iedActivity: string): SectorCode {
  const eprtr = EPRTR_SECTORS[/^(\d)/.exec(eprtrActivity)?.[1] ?? ''];
  if (eprtr) return eprtr;
  const ied = IED_SECTORS.find(
    ([prefix]) => iedActivity === prefix.replace(/\.$/, '') || iedActivity.startsWith(prefix),
  );
  return ied?.[1] ?? 'other';
}

function parseCoordinate(value: string, min: number, max: number): number | null {
  if (value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max && number !== 0 ? number : null;
}

function parseYear(value: string): number | null {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2007 && year <= 2100 ? year : null;
}

type FacilityDraft = {
  name: string | null;
  longitude: number | null;
  latitude: number | null;
  eprtrActivity: string;
  iedActivity: string;
  isOpen: boolean;
  airReleases: Record<string, number>;
  hasWaterReleases: boolean;
};

function draftFor(drafts: Map<string, FacilityDraft>, id: string): FacilityDraft {
  let draft = drafts.get(id);
  if (!draft) {
    draft = {
      name: null,
      longitude: null,
      latitude: null,
      eprtrActivity: '',
      iedActivity: '',
      isOpen: false,
      airReleases: {},
      hasWaterReleases: false,
    };
    drafts.set(id, draft);
  }
  return draft;
}

function placeDraft(
  draft: FacilityDraft,
  name: string,
  longitude: string,
  latitude: string,
  eprtrActivity: string,
): void {
  if (!draft.name && name !== '') draft.name = name;
  if (draft.longitude === null || draft.latitude === null) {
    const lon = parseCoordinate(longitude, -180, 180);
    const lat = parseCoordinate(latitude, -90, 90);
    if (lon !== null && lat !== null) {
      draft.longitude = lon;
      draft.latitude = lat;
    }
  }
  if (draft.eprtrActivity === '' && eprtrActivity !== '') draft.eprtrActivity = eprtrActivity;
}

export function latestReportingYear(
  installations: readonly InstallationRow[],
  airReleases: readonly ReleaseRow[],
): number | null {
  let latest: number | null = null;
  for (const row of [
    ...installations.map((r) => r.reportingYear),
    ...airReleases.map((r) => r.reportingYear),
  ]) {
    const year = parseYear(row);
    if (year !== null && (latest === null || year > latest)) latest = year;
  }
  return latest;
}

export function buildRegisterSites(input: {
  installations: readonly InstallationRow[];
  airReleases: readonly ReleaseRow[];
  waterReleases: readonly ReleaseRow[];
  reportingYear: number;
  params: Pick<
    IndustryParams,
    | 'air_pollutants'
    | 'top_emitter_pollutants'
    | 'top_emitter_share'
    | 'odour_sectors'
    | 'winter_activities'
  >;
}): RegisterSite[] {
  const year = String(input.reportingYear);
  const drafts = new Map<string, FacilityDraft>();

  for (const row of input.installations) {
    if (row.reportingYear !== year || row.parent_facilityInspireId === '') continue;
    const draft = draftFor(drafts, row.parent_facilityInspireId);
    if (!CLOSED_STATUSES.has(row.installationStatus)) draft.isOpen = true;
    if (draft.iedActivity === '' && row.IEDAnnexIMainActivity !== '') {
      draft.iedActivity = row.IEDAnnexIMainActivity;
    }
    placeDraft(
      draft,
      row.installationName,
      row.Longitude,
      row.Latitude,
      row.EPRTRAnnexIMainActivity,
    );
  }

  for (const row of input.airReleases) {
    if (row.reportingYear !== year || row.FacilityInspireId === '') continue;
    const draft = draftFor(drafts, row.FacilityInspireId);
    draft.isOpen = true;
    draft.name = row.facilityName !== '' ? row.facilityName : draft.name;
    placeDraft(draft, row.facilityName, row.Longitude, row.Latitude, row.EPRTRAnnexIMainActivity);
    const code = pollutantCode(row.Pollutant);
    const amount = Number(row.Releases);
    if (code && row.Releases !== '' && Number.isFinite(amount) && amount > 0) {
      draft.airReleases[code] = (draft.airReleases[code] ?? 0) + amount;
    }
  }

  for (const row of input.waterReleases) {
    if (row.reportingYear !== year) continue;
    const draft = drafts.get(row.FacilityInspireId);
    if (draft && Number(row.Releases) > 0) draft.hasWaterReleases = true;
  }

  const open = [...drafts.entries()].filter(
    ([, draft]) =>
      draft.isOpen && draft.name !== null && draft.longitude !== null && draft.latitude !== null,
  );
  const releases = new Map(open.map(([id, draft]) => [id, draft.airReleases]));
  const thresholds = topEmitterThresholds(
    releases,
    input.params.top_emitter_pollutants,
    input.params.top_emitter_share,
  );
  const airPollutants = new Set(input.params.air_pollutants);
  const odourSectors = new Set<string>(input.params.odour_sectors);
  const winterActivities = new Set(input.params.winter_activities);

  return open
    .map(([id, draft]) => {
      const sectorCode = sectorFromActivity(draft.eprtrActivity, draft.iedActivity);
      const mainActivityCode = (draft.eprtrActivity || draft.iedActivity || 'unknown').slice(0, 40);
      const hasAir = Object.keys(draft.airReleases).some((code) => airPollutants.has(code));
      const impactCodes = [
        hasAir ? 'air' : null,
        draft.hasWaterReleases ? 'water' : null,
        odourSectors.has(sectorCode) ? 'odour' : null,
        winterActivities.has(draft.eprtrActivity) ? 'seasonal_winter' : null,
      ].filter((code): code is string => code !== null);
      return {
        sourceFacilityId: id,
        reportingYear: input.reportingYear,
        name: (draft.name ?? id).slice(0, 300),
        longitude: draft.longitude ?? 0,
        latitude: draft.latitude ?? 0,
        sectorCode,
        mainActivityCode,
        impactCodes,
        airReleases: draft.airReleases,
        isTopEmitter: hasAir && isTopEmitter(draft.airReleases, thresholds),
      };
    })
    .sort((a, b) => a.sourceFacilityId.localeCompare(b.sourceFacilityId));
}

export async function readCountryRows<Column extends string>(
  chunks: AsyncIterable<string> | Iterable<string>,
  columns: readonly Column[],
  countryColumn: Column,
  country: string,
  source: string,
): Promise<Record<Column, string>[]> {
  const rows: Record<Column, string>[] = [];
  for await (const row of readCsvObjects(chunks, columns, source)) {
    if (row[countryColumn] === country) rows.push(row);
  }
  return rows;
}
