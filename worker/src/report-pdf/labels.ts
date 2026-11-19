import type { CategoryKey } from '../scoring/categories.ts';
import type { IconName } from './icons.ts';
import { CATEGORY_THEME, CONTEXT_THEME } from './theme.ts';

export const CATEGORY_GROUPS: readonly { title: string; keys: readonly CategoryKey[] }[] = [
  { title: 'Contează cel mai mult', keys: ['accessibility', 'fifteen_minute', 'safety'] },
  { title: 'Mediu și liniște', keys: ['noise', 'green', 'air', 'industry'] },
  { title: 'Servicii', keys: ['education', 'health'] },
];

export const CATEGORY_SCOPE: Record<CategoryKey, { includes: string; excludes: string }> = {
  safety: {
    includes: 'lumină, lume pe stradă, magazine deschise, poliție și pompieri',
    excludes: 'infracțiuni: nu există date publice pe stradă',
  },
  accessibility: {
    includes: 'stațiile din jur, câte linii trec, cât de des și cât faci până la oraș',
    excludes: 'aglomerația din vehicule și întârzieri',
  },
  fifteen_minute: {
    includes: 'magazine, sănătate, școli, parcuri și servicii la cel mult 15 minute pe jos',
    excludes: 'cât de bun e fiecare loc',
  },
  green: {
    includes: 'cât verde e în jur și cât de aproape sunt parcurile mari',
    excludes: 'cât de îngrijite sunt parcurile sau curțile private',
  },
  noise: {
    includes: 'străzile, tramvaiul și calea ferată din jur',
    excludes: 'ferestre, izolație sau vecini',
  },
  air: {
    includes: 'praful fin din aer, media pe un an, la nivel de oraș',
    excludes: 'diferențele de la o stradă la alta',
  },
  industry: {
    includes: 'instalațiile industriale din registrul european',
    excludes: 'atelierele mici care nu intră în registru',
  },
  education: {
    includes: 'grădinițele, școlile și liceele la care ajungi pe jos',
    excludes: 'calitatea școlilor și circumscripția școlară',
  },
  health: {
    includes: 'farmacii, medici, clinici și spitalul cu urgențe',
    excludes: 'programul și timpii de așteptare',
  },
};

export const FIFTEEN_MINUTE_CATEGORIES: Record<string, string> = {
  supermarket: 'Supermarket',
  convenience: 'Magazin de cartier',
  bakery: 'Brutărie',
  greengrocer_market: 'Piață sau aprozar',
  butcher: 'Măcelărie',
  drugstore: 'Drogerie',
  restaurant: 'Restaurant',
  cafe: 'Cafenea',
  bank_atm: 'Bancă sau bancomat',
  post: 'Poștă sau easybox',
  hairdresser: 'Frizerie sau coafor',
  laundry: 'Curățătorie',
  car_service: 'Service auto',
  public_office: 'Instituție publică',
  pharmacy: 'Farmacie',
  doctor: 'Medic de familie',
  dentist: 'Stomatolog',
  clinic: 'Clinică',
  veterinary: 'Cabinet veterinar',
  kindergarten: 'Grădiniță',
  school: 'Școală',
  high_school: 'Liceu',
  park: 'Parc',
  playground: 'Loc de joacă',
  fitness: 'Sală de fitness',
  sports_ground: 'Teren de sport',
  swimming_pool: 'Piscină',
  library: 'Bibliotecă',
  cinema_theatre: 'Cinema sau teatru',
  place_of_worship: 'Lăcaș de cult',
  other: 'Alt serviciu',
};

export const FIFTEEN_MINUTE_GROUPS: Record<
  string,
  { label: string; icon: IconName; color: string; tint: string }
> = {
  shops: { label: 'magazine', icon: 'mall', color: '#B4532D', tint: '#FBE9DF' },
  food_drink: { label: 'restaurante și cafenele', icon: 'cup', color: '#7C3AED', tint: '#EEE7FD' },
  services: {
    label: 'bănci, poștă și alte servicii',
    icon: 'bank',
    color: '#55607A',
    tint: '#E9ECF2',
  },
  pharmacies: { label: 'farmacii', icon: 'pill', color: '#BE185D', tint: '#FCE7F0' },
  medical: { label: 'medici și clinici', icon: 'heart', color: '#BE185D', tint: '#FCE7F0' },
  schools: { label: 'școli și grădinițe', icon: 'school', color: '#2563EB', tint: '#E3ECFD' },
  parks: { label: 'parcuri și locuri de joacă', icon: 'tree', color: '#3F6E1B', tint: '#E6F0D8' },
  sport: { label: 'săli și terenuri de sport', icon: 'dumb', color: '#3F6E1B', tint: '#E6F0D8' },
  culture: {
    label: 'cinematografe, teatre, biblioteci',
    icon: 'ticket',
    color: '#7C3AED',
    tint: '#EEE7FD',
  },
};

export const FIFTEEN_MINUTE_KEY: readonly { label: string; color: string }[] = [
  { label: 'Cumpărături', color: '#B4532D' },
  { label: 'Sănătate', color: '#BE185D' },
  { label: 'Copii și școală', color: '#2563EB' },
  { label: 'Verde și mișcare', color: '#3F6E1B' },
  { label: 'Servicii', color: '#55607A' },
  { label: 'Ieșit în oraș', color: '#7C3AED' },
];

export const EDUCATION_LEVELS: Record<string, string> = {
  kindergarten: 'Grădiniță',
  school: 'Școală',
  high_school: 'Liceu',
};

export const HEALTH_LAYERS: Record<string, string> = {
  h1: 'Farmacie',
  h2: 'Medic de familie',
  h3: 'Clinică sau policlinică',
  h4: 'Spital cu urgențe',
  h5: 'Farmacie non-stop',
};

const SAFETY_TYPES: Record<string, { label: string; icon: IconName; color: string }> = {
  lighting: { label: 'Iluminat', icon: 'bulb', color: '#C98A12' },
  shop: { label: 'Magazine', icon: 'mall', color: '#2F5164' },
  nonstop: { label: 'Non-stop', icon: 'clock', color: '#6B4FA0' },
  mixed_use: { label: 'Clădiri cu parter comercial', icon: 'house', color: '#2F5164' },
  police: { label: 'Poliție', icon: 'shield', color: '#1F6B9A' },
  fire_station: { label: 'Pompieri', icon: 'flame', color: '#C2410C' },
  diplomatic: { label: 'Consulate', icon: 'flag', color: '#0F766E' },
  bar: { label: 'Baruri, cluburi', icon: 'glass', color: '#B4235A' },
  park: { label: 'Parcuri', icon: 'leaf', color: '#3F6E1B' },
  park_lit: { label: 'Parcuri iluminate', icon: 'leaf', color: '#3F6E1B' },
  isolated_passage: { label: 'Pasaje, căi ferate', icon: 'tunnel', color: '#8A3B22' },
  train_station: { label: 'Gări', icon: 'rail', color: '#475569' },
  train_halt: { label: 'Halte', icon: 'rail', color: '#475569' },
  transit_stop: { label: 'Stații', icon: 'bus', color: '#55607A' },
};

const UNKNOWN_SAFETY_TYPE = { icon: 'pin', color: '#52685B' } as const;

export function safetyType(type: string): { label: string; icon: IconName; color: string } {
  return SAFETY_TYPES[type] ?? { label: type, ...UNKNOWN_SAFETY_TYPE };
}

export const DESTINATION_KINDS: Record<string, { icon: IconName; color: string; tint: string }> = {
  centre: { icon: 'pin', color: '#2F5164', tint: '#DCE6EC' },
  station: { icon: 'train', color: '#0F766E', tint: '#D5ECE9' },
  university: { icon: 'uni', color: '#7C3AED', tint: '#EBE3FB' },
  hospital: { icon: 'heart', color: '#DB2777', tint: '#FBE0EC' },
  mall: { icon: 'mall', color: '#B91C1C', tint: '#F8DEDA' },
  airport: { icon: 'plane', color: '#334155', tint: '#E4E8EE' },
};

export const NOISE_KINDS: Record<string, string> = {
  road: 'stradă',
  tram: 'tramvai',
  rail: 'cale ferată',
  air: 'aeroport',
  industry: 'industrie',
  aggregate: 'mai multe surse',
};

export const NOISE_REFERENCES: readonly { db: number; label: string }[] = [
  { db: 40, label: 'cameră liniștită' },
  { db: 50, label: 'stradă liniștită' },
  { db: 60, label: 'conversație' },
  { db: 70, label: 'trafic intens' },
];

export const INDUSTRY_SECTORS: Record<string, string> = {
  energy: 'energie',
  metals: 'metalurgie',
  minerals: 'materiale de construcții',
  chemicals: 'chimie',
  waste_water: 'deșeuri și ape uzate',
  paper_wood: 'hârtie și lemn',
  livestock: 'fermă de animale',
  food: 'industrie alimentară',
  other: 'altă activitate',
};

export const INDUSTRY_IMPACTS: Record<string, string> = {
  air: 'emisii în aer',
  water: 'emisii în apă',
  odour: 'poate produce mirosuri',
  seasonal_winter: 'mai ales iarna',
};

export const GREEN_AMENITIES: Record<string, string> = {
  playground: 'Loc de joacă',
  dog_park: 'Loc pentru câini',
  sports: 'Teren de sport',
};

export const SEISMIC_LEVELS: Record<string, string> = {
  low: 'Scăzut',
  moderate: 'Moderat',
  high: 'Ridicat',
  very_high: 'Foarte ridicat',
};

export const CITY_NAMES: Record<string, string> = {
  bucuresti: 'București',
  'cluj-napoca': 'Cluj-Napoca',
  timisoara: 'Timișoara',
  iasi: 'Iași',
  constanta: 'Constanța',
  craiova: 'Craiova',
  sibiu: 'Sibiu',
  oradea: 'Oradea',
  'targu-mures': 'Târgu Mureș',
};

export const SOURCE_LABELS: Record<string, string> = {
  osm: 'OpenStreetMap',
  walk_routing: 'Rutare pe jos',
  gtfs: 'Orare transport public (GTFS)',
  cams: 'Copernicus CAMS',
  eea_stations: 'Stații de măsurare a aerului (EEA)',
  eea_air_map: 'Harta calității aerului (EEA)',
  eea_industrial: 'Registrul industrial EEA',
  eea_industrial_year: 'Registrul industrial EEA, anul raportărilor',
  noise: 'Hărți strategice de zgomot',
  siiir: 'Registrul unităților de învățământ (SIIIR)',
  cnas: 'Liste CNAS',
  ms_upu: 'Unități de primiri urgențe (UPU/CPU)',
  seismic: 'Cod seismic P100-1/2013',
};

export const MARKET_SOURCES: Record<string, string> = {
  apartamente_org: 'apartamente.org',
  apartamente_org_index: 'apartamente.org, indicele lunar',
  imospot_index: 'Indicele Imospot',
};

export const CATEGORY_SOURCES: Record<CategoryKey, readonly string[]> = {
  safety: ['osm', 'walk_routing'],
  accessibility: ['gtfs', 'osm', 'walk_routing'],
  fifteen_minute: ['osm', 'walk_routing'],
  green: ['osm', 'walk_routing'],
  noise: ['osm'],
  air: ['cams', 'eea_stations'],
  industry: ['eea_industrial'],
  education: ['siiir', 'osm'],
  health: ['cnas', 'ms_upu', 'osm'],
};

export const TRANSIT_MODES: Record<string, string> = {
  tram: 'tramvaiul',
  bus: 'autobuzul',
  trolleybus: 'troleibuzul',
  metro: 'metroul',
  rail: 'trenul',
  ferry: 'vaporul',
};

export const NOISE_CLASSES: Record<string, string> = {
  motorway: 'autostradă',
  trunk: 'drum expres',
  primary: 'bulevard',
  secondary: 'stradă circulată',
  tertiary: 'stradă de cartier',
  residential: 'stradă liniștită',
  tram: 'tramvai',
  rail: 'cale ferată',
};

export type ViewingQuestion = {
  question: string;
  why: string;
  topic: string;
  color: string;
  tint: string;
};

const APARTMENT_TOPIC = { topic: 'Apartament', color: '#2F5164', tint: '#DCE6EC' };

export const VIEWING_QUESTIONS: Record<string, ViewingQuestion> = {
  bedroom_facade_side: {
    question: 'Spre ce dau dormitoarele: spre stradă sau spre curte?',
    why: 'Zgomotul diferă mult între fața și spatele blocului. Scorul descrie zona, nu fațada.',
    topic: CATEGORY_THEME.noise.name,
    color: CATEGORY_THEME.noise.color,
    tint: CATEGORY_THEME.noise.tint,
  },
  construction_year: {
    question: 'În ce an a fost construit blocul și are expertiză tehnică?',
    why: 'Anul arată după ce normativ a fost proiectat. Fără el, nu putem judeca riscul clădirii.',
    topic: 'Risc seismic',
    color: CONTEXT_THEME.seismic.color,
    tint: CONTEXT_THEME.seismic.tint,
  },
  stairs_without_elevator: {
    question: 'Blocul nu are lift: cum e urcatul pe scări cu cumpărături sau cu un copil?',
    why: 'La etajele de sus, fiecare drum zilnic și orice mutare se simt din plin.',
    ...APARTMENT_TOPIC,
  },
  ground_floor_damp_and_security: {
    question: 'Apartamentul e la parter: apare umezeală și cum sunt asigurate geamurile și ușa?',
    why: 'Parterul e mai expus la umezeală, la zgomotul străzii și la intrări neautorizate.',
    ...APARTMENT_TOPIC,
  },
  top_floor_roof_and_insulation: {
    question: 'Apartamentul e la ultimul etaj: când s-a refăcut acoperișul și cum e izolat?',
    why: 'Infiltrațiile și căldura din timpul verii vin de la acoperiș și de la terasă.',
    ...APARTMENT_TOPIC,
  },
};
