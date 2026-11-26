import type { CategoryKey } from '../scoring/categories.ts';
import type { IconName } from './icons.ts';

import { localize, type Copy } from './format.ts';
import type { ReportLocale } from './report-data.ts';

export const CATEGORY_GROUPS: readonly { title: Copy; keys: readonly CategoryKey[] }[] = [
  {
    title: ['Contează cel mai mult', 'Most important'],
    keys: ['accessibility', 'fifteen_minute', 'safety'],
  },
  {
    title: ['Mediu și liniște', 'Environment and quiet'],
    keys: ['noise', 'green', 'air', 'industry'],
  },
  { title: ['Servicii', 'Services'], keys: ['education', 'health'] },
];

export const CATEGORY_SCOPE: Record<CategoryKey, { includes: Copy; excludes: Copy }> = {
  safety: {
    includes: [
      'lumină, lume pe stradă, magazine deschise, poliție și pompieri',
      'street lighting, people on the street, open shops, police and fire stations',
    ],
    excludes: [
      'infracțiuni: nu există date publice pe stradă',
      'crime: no public street-level data',
    ],
  },
  accessibility: {
    includes: [
      'stațiile din jur, câte linii trec, cât de des și cât faci până la oraș',
      'nearby stops, the number and frequency of routes, and journey times',
    ],
    excludes: ['aglomerația din vehicule și întârzieri', 'crowding and delays'],
  },
  fifteen_minute: {
    includes: [
      'magazine, sănătate, școli, parcuri și servicii la cel mult 15 minute pe jos',
      'shops, healthcare, schools, parks and services within a 15-minute walk',
    ],
    excludes: ['cât de bun e fiecare loc', 'the quality of individual places'],
  },
  green: {
    includes: [
      'cât verde e în jur și cât de aproape sunt parcurile mari',
      'the amount of green space nearby and the distance to large parks',
    ],
    excludes: [
      'cât de îngrijite sunt parcurile sau curțile private',
      'the condition of parks or private gardens',
    ],
  },
  noise: {
    includes: [
      'străzile, tramvaiul și calea ferată din jur',
      'nearby roads, tram lines and railways',
    ],
    excludes: ['ferestre, izolație sau vecini', 'windows, insulation or neighbours'],
  },
  air: {
    includes: [
      'praful fin din aer, media pe un an, la nivel de oraș',
      'annual average fine particle pollution across the city',
    ],
    excludes: ['diferențele de la o stradă la alta', 'street-to-street differences'],
  },
  industry: {
    includes: [
      'instalațiile industriale din registrul european',
      'industrial facilities in the European register',
    ],
    excludes: [
      'atelierele mici care nu intră în registru',
      'small workshops not listed in the register',
    ],
  },
  education: {
    includes: [
      'grădinițele, școlile și liceele la care ajungi pe jos',
      'nurseries, schools and secondary schools within walking distance',
    ],
    excludes: [
      'calitatea școlilor și circumscripția școlară',
      'school quality and catchment areas',
    ],
  },
  health: {
    includes: [
      'farmacii, medici, clinici și spitalul cu urgențe',
      'pharmacies, doctors, clinics and the hospital with an emergency department',
    ],
    excludes: ['programul și timpii de așteptare', 'opening hours and waiting times'],
  },
};

export const FIFTEEN_MINUTE_CATEGORIES: Record<string, Copy> = {
  supermarket: ['Supermarket', 'Supermarket'],
  convenience: ['Magazin de cartier', 'Convenience store'],
  bakery: ['Brutărie', 'Bakery'],
  greengrocer_market: ['Piață sau aprozar', 'Market or greengrocer'],
  butcher: ['Măcelărie', 'Butcher'],
  drugstore: ['Drogerie', 'Health and beauty shop'],
  restaurant: ['Restaurant', 'Restaurant'],
  cafe: ['Cafenea', 'Café'],
  bank_atm: ['Bancă sau bancomat', 'Bank or cash machine'],
  post: ['Poștă sau easybox', 'Post office or parcel locker'],
  hairdresser: ['Frizerie sau coafor', 'Barber or hairdresser'],
  laundry: ['Curățătorie', 'Dry cleaner'],
  car_service: ['Service auto', 'Car repair shop'],
  public_office: ['Instituție publică', 'Public office'],
  pharmacy: ['Farmacie', 'Pharmacy'],
  doctor: ['Medic de familie', 'GP'],
  dentist: ['Stomatolog', 'Dentist'],
  clinic: ['Clinică', 'Clinic'],
  veterinary: ['Cabinet veterinar', 'Veterinary practice'],
  kindergarten: ['Grădiniță', 'Nursery'],
  school: ['Școală', 'School'],
  high_school: ['Liceu', 'Secondary school'],
  park: ['Parc', 'Park'],
  playground: ['Loc de joacă', 'Playground'],
  fitness: ['Sală de fitness', 'Gym'],
  sports_ground: ['Teren de sport', 'Sports ground'],
  swimming_pool: ['Piscină', 'Swimming pool'],
  library: ['Bibliotecă', 'Library'],
  cinema_theatre: ['Cinema sau teatru', 'Cinema or theatre'],
  place_of_worship: ['Lăcaș de cult', 'Place of worship'],
  other: ['Alt serviciu', 'Other service'],
};

export const FIFTEEN_MINUTE_GROUPS: Record<
  string,
  { label: Copy; icon: IconName; color: string; tint: string }
> = {
  shops: { label: ['magazine', 'shops'], icon: 'mall', color: '#B4532D', tint: '#FBE9DF' },
  food_drink: {
    label: ['restaurante și cafenele', 'restaurants and cafés'],
    icon: 'cup',
    color: '#7C3AED',
    tint: '#EEE7FD',
  },
  services: {
    label: ['bănci, poștă și alte servicii', 'banks, post offices and other services'],
    icon: 'bank',
    color: '#55607A',
    tint: '#E9ECF2',
  },
  pharmacies: {
    label: ['farmacii', 'pharmacies'],
    icon: 'pill',
    color: '#BE185D',
    tint: '#FCE7F0',
  },
  medical: {
    label: ['medici și clinici', 'doctors and clinics'],
    icon: 'heart',
    color: '#BE185D',
    tint: '#FCE7F0',
  },
  schools: {
    label: ['școli și grădinițe', 'schools and nurseries'],
    icon: 'school',
    color: '#2563EB',
    tint: '#E3ECFD',
  },
  parks: {
    label: ['parcuri și locuri de joacă', 'parks and playgrounds'],
    icon: 'tree',
    color: '#3F6E1B',
    tint: '#E6F0D8',
  },
  sport: {
    label: ['săli și terenuri de sport', 'gyms and sports grounds'],
    icon: 'dumb',
    color: '#3F6E1B',
    tint: '#E6F0D8',
  },
  culture: {
    label: ['cinematografe, teatre, biblioteci', 'cinemas, theatres and libraries'],
    icon: 'ticket',
    color: '#7C3AED',
    tint: '#EEE7FD',
  },
};

export const FIFTEEN_MINUTE_KEY: readonly { label: Copy; color: string }[] = [
  { label: ['Cumpărături', 'Shopping'], color: '#B4532D' },
  { label: ['Sănătate', 'Healthcare'], color: '#BE185D' },
  { label: ['Copii și școală', 'Children and schools'], color: '#2563EB' },
  { label: ['Verde și mișcare', 'Green space and exercise'], color: '#3F6E1B' },
  { label: ['Servicii', 'Services'], color: '#55607A' },
  { label: ['Ieșit în oraș', 'Leisure'], color: '#7C3AED' },
];

export const EDUCATION_LEVELS: Record<string, Copy> = {
  kindergarten: ['Grădiniță', 'Nursery'],
  school: ['Școală', 'School'],
  high_school: ['Liceu', 'Secondary school'],
};

export const HEALTH_LAYERS: Record<string, Copy> = {
  h1: ['Farmacie', 'Pharmacy'],
  h2: ['Medic de familie', 'GP'],
  h3: ['Clinică sau policlinică', 'Clinic or outpatient centre'],
  h4: ['Spital cu urgențe', 'Hospital with emergency care'],
  h5: ['Farmacie non-stop', '24-hour pharmacy'],
};

const SAFETY_TYPES: Record<string, { label: Copy; icon: IconName; color: string }> = {
  lighting: { label: ['Iluminat', 'Street lighting'], icon: 'bulb', color: '#C98A12' },
  shop: { label: ['Magazine', 'Shops'], icon: 'mall', color: '#2F5164' },
  nonstop: { label: ['Non-stop', '24-hour shops'], icon: 'clock', color: '#6B4FA0' },
  mixed_use: {
    label: ['Clădiri cu parter comercial', 'Buildings with ground-floor shops'],
    icon: 'house',
    color: '#2F5164',
  },
  police: { label: ['Poliție', 'Police'], icon: 'shield', color: '#1F6B9A' },
  fire_station: { label: ['Pompieri', 'Fire stations'], icon: 'flame', color: '#C2410C' },
  diplomatic: { label: ['Consulate', 'Consulates'], icon: 'flag', color: '#0F766E' },
  bar: { label: ['Baruri, cluburi', 'Bars and clubs'], icon: 'glass', color: '#B4235A' },
  park: { label: ['Parcuri', 'Parks'], icon: 'leaf', color: '#3F6E1B' },
  park_lit: { label: ['Parcuri iluminate', 'Lit parks'], icon: 'leaf', color: '#3F6E1B' },
  isolated_passage: {
    label: ['Pasaje, căi ferate', 'Underpasses and railways'],
    icon: 'tunnel',
    color: '#8A3B22',
  },
  train_station: { label: ['Gări', 'Railway stations'], icon: 'rail', color: '#475569' },
  train_halt: { label: ['Halte', 'Rail stops'], icon: 'rail', color: '#475569' },
  transit_stop: { label: ['Stații', 'Transit stops'], icon: 'bus', color: '#55607A' },
};

const UNKNOWN_SAFETY_TYPE = { icon: 'pin', color: '#52685B' } as const;

export function safetyType(
  locale: ReportLocale,
  type: string,
): { label: string; icon: IconName; color: string } {
  const known = SAFETY_TYPES[type];
  return known
    ? { ...known, label: localize(locale, known.label) }
    : { label: type, ...UNKNOWN_SAFETY_TYPE };
}

export const DESTINATION_KINDS: Record<string, { icon: IconName; color: string; tint: string }> = {
  centre: { icon: 'pin', color: '#2F5164', tint: '#DCE6EC' },
  station: { icon: 'train', color: '#0F766E', tint: '#D5ECE9' },
  university: { icon: 'uni', color: '#7C3AED', tint: '#EBE3FB' },
  hospital: { icon: 'heart', color: '#DB2777', tint: '#FBE0EC' },
  mall: { icon: 'mall', color: '#B91C1C', tint: '#F8DEDA' },
  airport: { icon: 'plane', color: '#334155', tint: '#E4E8EE' },
};

export const NOISE_KINDS: Record<string, Copy> = {
  road: ['stradă', 'road'],
  tram: ['tramvai', 'tram'],
  rail: ['cale ferată', 'railway'],
  air: ['aeroport', 'airport'],
  industry: ['industrie', 'industry'],
  aggregate: ['mai multe surse', 'multiple sources'],
};

export const NOISE_REFERENCES: readonly { db: number; label: Copy }[] = [
  { db: 40, label: ['cameră liniștită', 'a quiet room'] },
  { db: 50, label: ['stradă liniștită', 'a quiet street'] },
  { db: 60, label: ['conversație', 'conversation'] },
  { db: 70, label: ['trafic intens', 'heavy traffic'] },
];

export const INDUSTRY_SECTORS: Record<string, Copy> = {
  energy: ['energie', 'energy'],
  metals: ['metalurgie', 'metalworking'],
  minerals: ['materiale de construcții', 'construction materials'],
  chemicals: ['chimie', 'chemicals'],
  waste_water: ['deșeuri și ape uzate', 'waste and wastewater'],
  paper_wood: ['hârtie și lemn', 'paper and wood'],
  livestock: ['fermă de animale', 'livestock farming'],
  food: ['industrie alimentară', 'food production'],
  other: ['altă activitate', 'other activity'],
};

export const INDUSTRY_IMPACTS: Record<string, Copy> = {
  air: ['emisii în aer', 'air emissions'],
  water: ['emisii în apă', 'water emissions'],
  odour: ['poate produce mirosuri', 'may cause odours'],
  seasonal_winter: ['mai ales iarna', 'especially in winter'],
};

export const GREEN_AMENITIES: Record<string, Copy> = {
  playground: ['Loc de joacă', 'Playground'],
  dog_park: ['Loc pentru câini', 'Dog park'],
  sports: ['Teren de sport', 'Sports ground'],
};

export const SEISMIC_LEVELS: Record<string, Copy> = {
  low: ['Scăzut', 'Low'],
  moderate: ['Moderat', 'Moderate'],
  high: ['Ridicat', 'High'],
  very_high: ['Foarte ridicat', 'Very high'],
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

export const SOURCE_LABELS: Record<string, Copy> = {
  osm: ['OpenStreetMap', 'OpenStreetMap'],
  walk_routing: ['Rutare pe jos', 'Pedestrian routing'],
  gtfs: ['Orare transport public (GTFS)', 'Public transport timetables (GTFS)'],
  cams: ['Copernicus CAMS', 'Copernicus CAMS'],
  eea_stations: ['Stații de măsurare a aerului (EEA)', 'Air monitoring stations (EEA)'],
  eea_air_map: ['Harta calității aerului (EEA)', 'Air quality map (EEA)'],
  eea_industrial: ['Registrul industrial EEA', 'EEA industrial register'],
  eea_industrial_year: [
    'Registrul industrial EEA, anul raportărilor',
    'EEA industrial register, reporting year',
  ],
  noise: ['Hărți strategice de zgomot', 'Strategic noise maps'],
  siiir: [
    'Registrul unităților de învățământ (SIIIR)',
    'Register of educational institutions (SIIIR)',
  ],
  cnas: ['Liste CNAS', 'CNAS lists'],
  ms_upu: ['Unități de primiri urgențe (UPU/CPU)', 'Emergency departments (UPU/CPU)'],
  seismic: ['Cod seismic P100-1/2013', 'Seismic code P100-1/2013'],
};

export const MARKET_SOURCES: Record<string, Copy> = {
  apartamente_org: ['apartamente.org', 'apartamente.org'],
  apartamente_org_index: ['apartamente.org, indicele lunar', 'apartamente.org monthly index'],
  imospot_index: ['Indicele Imospot', 'Imospot Index'],
};

export const MARKET_SOURCE_DETAILS: Record<string, Copy> = {
  'preț cerut la vânzare': ['preț cerut la vânzare', 'sale asking price'],
  'chirie cerută · exemplu': ['chirie cerută · exemplu', 'asking rent · example'],
  'istoricul lunar': ['istoricul lunar', 'monthly history'],
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

export const TRANSIT_MODES: Record<string, Copy> = {
  tram: ['tramvaiul', 'tram'],
  bus: ['autobuzul', 'bus'],
  trolleybus: ['troleibuzul', 'trolleybus'],
  metro: ['metroul', 'metro'],
  rail: ['trenul', 'train'],
  ferry: ['vaporul', 'ferry'],
};

export const NOISE_CLASSES: Record<string, Copy> = {
  motorway: ['autostradă', 'motorway'],
  trunk: ['drum expres', 'expressway'],
  primary: ['bulevard', 'main road'],
  secondary: ['stradă circulată', 'busy road'],
  tertiary: ['stradă de cartier', 'local street'],
  residential: ['stradă liniștită', 'a quiet street'],
  tram: ['tramvai', 'tram'],
  rail: ['cale ferată', 'railway'],
};
