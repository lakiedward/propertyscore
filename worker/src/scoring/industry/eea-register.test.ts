import { describe, expect, it } from 'vitest';

import {
  buildRegisterSites,
  latestReportingYear,
  pollutantCode,
  readCountryRows,
  RELEASE_COLUMNS,
  sectorFromActivity,
  type InstallationRow,
  type ReleaseRow,
} from './eea-register.ts';

const PARAMS = {
  air_pollutants: ['nox', 'pm10', 'nh3'],
  top_emitter_pollutants: ['nox', 'pm10'],
  top_emitter_share: 0.5,
  odour_sectors: ['waste_water' as const, 'livestock' as const],
  winter_activities: ['1(c)'],
};

function installation(overrides: Partial<InstallationRow>): InstallationRow {
  return {
    CountryName: 'Romania',
    reportingYear: '2024',
    parent_facilityInspireId: 'RO.CAED/1.FACILITY',
    EPRTRAnnexIMainActivity: '1(c)',
    installationName: 'CET Centru',
    Longitude: '21.246944',
    Latitude: '45.755555',
    installationStatus: 'functional',
    IEDAnnexIMainActivity: '1.1',
    ...overrides,
  };
}

function release(overrides: Partial<ReleaseRow>): ReleaseRow {
  return {
    countryName: 'Romania',
    reportingYear: '2024',
    EPRTRAnnexIMainActivity: '1(c)',
    FacilityInspireId: 'RO.CAED/1.FACILITY',
    facilityName: 'SC COLTERM SA - CET CENTRU',
    Longitude: '21.246944',
    Latitude: '45.755555',
    Pollutant: 'Nitrogen oxides (NOX)',
    Releases: '120000',
    ...overrides,
  };
}

describe('pollutantCode', () => {
  it('maps the known EEA names and slugs the others', () => {
    expect(pollutantCode('Nitrogen oxides (NOX)')).toBe('nox');
    expect(pollutantCode('Fine particulate matter (PM2.5)')).toBe('pm2_5');
    expect(pollutantCode('Trichloroethylene (TRI)')).toBe('tri');
    expect(pollutantCode('Toluene')).toBe('toluene');
    expect(pollutantCode('CONFIDENTIAL')).toBeNull();
  });
});

describe('sectorFromActivity', () => {
  it('reads the E-PRTR annex I sector and falls back to the IED activity', () => {
    expect(sectorFromActivity('1(c)', '')).toBe('energy');
    expect(sectorFromActivity('7(a)(i)', '6.6(a)')).toBe('livestock');
    expect(sectorFromActivity('5(d)', '')).toBe('waste_water');
    expect(sectorFromActivity('', '6.4(b)(ii)')).toBe('food');
    expect(sectorFromActivity('', '6.1')).toBe('paper_wood');
    expect(sectorFromActivity('', '2.6')).toBe('metals');
    expect(sectorFromActivity('', '')).toBe('other');
  });
});

describe('buildRegisterSites', () => {
  const installations = [
    installation({}),
    installation({
      parent_facilityInspireId: 'RO.CAED/2.FACILITY',
      EPRTRAnnexIMainActivity: '5(f)',
      installationName: 'Statia de epurare',
      Longitude: '21.17',
      Latitude: '45.79',
      IEDAnnexIMainActivity: '6.11',
    }),
    installation({
      parent_facilityInspireId: 'RO.CAED/3.FACILITY',
      installationName: 'Fabrica inchisa',
      installationStatus: 'decommissioned',
    }),
    installation({
      parent_facilityInspireId: 'RO.CAED/4.FACILITY',
      installationName: 'Fara coordonate',
      Longitude: '',
      Latitude: '',
    }),
    installation({ reportingYear: '2023', parent_facilityInspireId: 'RO.CAED/5.FACILITY' }),
  ];
  const airReleases = [
    release({}),
    release({ Pollutant: 'Carbon dioxide (CO2)', Releases: '90000000' }),
    release({
      FacilityInspireId: 'RO.CAED/6.FACILITY',
      facilityName: 'Ferma de porci',
      EPRTRAnnexIMainActivity: '7(a)(ii)',
      Longitude: '21.3',
      Latitude: '45.7',
      Pollutant: 'Ammonia (NH3)',
      Releases: '15000',
    }),
    release({
      FacilityInspireId: 'RO.CAED/7.FACILITY',
      facilityName: 'Mic emitent',
      EPRTRAnnexIMainActivity: '2(b)',
      Longitude: '21.31',
      Latitude: '45.71',
      Pollutant: 'Nitrogen oxides (NOX)',
      Releases: '200',
    }),
    release({ Pollutant: 'CONFIDENTIAL', Releases: '' }),
  ];
  const waterReleases = [
    release({
      FacilityInspireId: 'RO.CAED/2.FACILITY',
      Pollutant: 'Total nitrogen',
      Releases: '5000',
    }),
  ];

  const sites = buildRegisterSites({
    installations,
    airReleases,
    waterReleases,
    reportingYear: 2024,
    params: PARAMS,
  });

  it('keeps the open facilities of the year that have a position', () => {
    expect(sites.map((site) => site.sourceFacilityId)).toEqual([
      'RO.CAED/1.FACILITY',
      'RO.CAED/2.FACILITY',
      'RO.CAED/6.FACILITY',
      'RO.CAED/7.FACILITY',
    ]);
  });

  it('derives the sector, the impacts and the summed air releases', () => {
    const chp = sites[0];
    expect(chp).toMatchObject({
      name: 'SC COLTERM SA - CET CENTRU',
      sectorCode: 'energy',
      mainActivityCode: '1(c)',
      impactCodes: ['air', 'seasonal_winter'],
      airReleases: { nox: 120000, co2: 90000000 },
      isTopEmitter: true,
      longitude: 21.246944,
      latitude: 45.755555,
    });
    expect(sites[1]).toMatchObject({
      sectorCode: 'waste_water',
      impactCodes: ['water', 'odour'],
      airReleases: {},
      isTopEmitter: false,
    });
    expect(sites[2]).toMatchObject({ sectorCode: 'livestock', impactCodes: ['air', 'odour'] });
    expect(sites[3]).toMatchObject({ sectorCode: 'metals', isTopEmitter: false });
  });

  it('finds the latest reporting year', () => {
    expect(latestReportingYear(installations, airReleases)).toBe(2024);
    expect(latestReportingYear([], [])).toBeNull();
  });
});

describe('readCountryRows', () => {
  it('keeps only the rows of the requested country', async () => {
    const header = RELEASE_COLUMNS.join(',');
    const rows = await readCountryRows(
      [
        `${header}\nRomania,2024,1(c),RO.1,"A, SA",21,45,NOX,1\n`,
        `Hungary,2024,1(c),HU.1,B,19,47,NOX,1\n`,
      ],
      RELEASE_COLUMNS,
      'countryName',
      'Romania',
      'air.csv',
    );
    expect(rows.map((row) => row.facilityName)).toEqual(['A, SA']);
  });
});
