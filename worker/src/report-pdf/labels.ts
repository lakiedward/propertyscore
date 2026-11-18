import type { CategoryKey } from '../scoring/categories.ts';

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  safety: 'Siguranță',
  accessibility: 'Accesibilitate',
  fifteen_minute: '15 minute',
  green: 'Spații verzi',
  noise: 'Zgomot',
  air: 'Aer',
  industry: 'Industrie',
  education: 'Educație',
  health: 'Sănătate',
};

export const CATEGORY_COLORS: Record<CategoryKey, string> = {
  safety: '#1C6B67',
  accessibility: '#7E5F00',
  fifteen_minute: '#8A356F',
  green: '#3F6E1B',
  noise: '#1F6B9A',
  air: '#3F6478',
  industry: '#52685B',
  education: '#9E4A22',
  health: '#A63A24',
};

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

export const FIFTEEN_MINUTE_GROUPS: Record<string, string> = {
  shops: 'cumpărături',
  food_drink: 'restaurante și cafenele',
  services: 'servicii',
  pharmacies: 'farmacii',
  medical: 'medici și clinici',
  schools: 'școli',
  parks: 'parcuri',
  sport: 'sport',
  culture: 'cultură',
  other: 'altele',
};

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

export const SAFETY_TYPES: Record<string, string> = {
  lighting: 'Iluminat',
  shop: 'Magazine',
  nonstop: 'Non-stop',
  mixed_use: 'Clădiri cu parter comercial',
  police: 'Poliție',
  fire_station: 'Pompieri',
  diplomatic: 'Consulate',
  bar: 'Baruri, cluburi',
  park: 'Parcuri',
  park_lit: 'Parcuri iluminate',
  isolated_passage: 'Pasaje, căi ferate',
  train_station: 'Gări',
  train_halt: 'Halte',
  transit_stop: 'Stații',
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
