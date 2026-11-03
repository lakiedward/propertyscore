import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { pickStationMonths, type StationMonth } from './air.sources.ts';
import {
  dailyMeans,
  monthlyFromDaily,
  parseParquetUrlList,
  parseStationMetadata,
  readMeasurementRows,
  type MeasurementRow,
} from './stations.source.ts';

const HEADER = [
  'Countrycode',
  'AirQualityStationEoICode',
  'SamplingPoint',
  'AirPollutantCode',
  'ObservationDateBegin',
  'ObservationDateEnd',
  'Longitude',
  'Latitude',
  'AirQualityStationType',
  'AirQualityStationArea',
].join('\t');

const POLLUTANT = 'http://dd.eionet.europa.eu/vocabulary/aq/pollutant';

function metadataLine(cells: string[]): string {
  return cells.join('\t');
}

describe('parseStationMetadata', () => {
  const text = [
    HEADER,
    metadataLine([
      'RO',
      'RO0072A',
      'SPO-RO0072A_00008_100',
      `${POLLUTANT}/8`,
      '2010-01-01T00:00:00',
      '',
      '24.15',
      '45.79',
      'background',
      'urban',
    ]),
    metadataLine([
      'RO',
      'RO0072A',
      'SPO-RO0072A_06001_100',
      `${POLLUTANT}/6001`,
      '2008-05-01T00:00:00',
      '2015-01-01T00:00:00',
      '24.15',
      '45.79',
      'background',
      'urban',
    ]),
    metadataLine([
      'RO',
      'RO0080A',
      'SPO-RO0080A_00001_100',
      `${POLLUTANT}/1`,
      '2010-01-01T00:00:00',
      '',
      '23.6',
      '46.77',
      'traffic',
      'urban',
    ]),
    metadataLine([
      'RO',
      'RO0081A',
      'SPO-RO0081A_00008_100',
      `${POLLUTANT}/8`,
      '2012-01-01T00:00:00',
      '2020-01-01T00:00:00',
      '23.6',
      '46.77',
      'traffic',
      'urban',
    ]),
    metadataLine([
      'BG',
      'BG0050A',
      'SPO-BG0050A_00008_100',
      `${POLLUTANT}/8`,
      '2010-01-01T00:00:00',
      '',
      '23.3',
      '42.7',
      'background',
      'urban',
    ]),
    '',
  ].join('\n');

  it('keeps the stations of the country that measure PM2.5 or NO2', () => {
    const metadata = parseStationMetadata(text, 'RO');
    expect(metadata.stations).toEqual([
      {
        eoi_code: 'RO0072A',
        station_type: 'background',
        area_type: 'urban',
        longitude: 24.15,
        latitude: 45.79,
        active_from: '2008-05-01',
        active_to: null,
      },
      {
        eoi_code: 'RO0081A',
        station_type: 'traffic',
        area_type: 'urban',
        longitude: 23.6,
        latitude: 46.77,
        active_from: '2012-01-01',
        active_to: '2020-01-01',
      },
    ]);
    expect(metadata.samplingPoints.get('SPO-RO0072A_06001_100')).toEqual({
      eoiCode: 'RO0072A',
      pollutant: 'pm25',
    });
    expect(metadata.samplingPoints.has('SPO-RO0080A_00001_100')).toBe(false);
  });

  it('refuses a file without the expected columns', () => {
    expect(() => parseStationMetadata('Countrycode\tOther\n', 'RO')).toThrow(
      expect.objectContaining({ code: 'station_metadata_unreadable' }),
    );
  });
});

describe('parseParquetUrlList', () => {
  it('reads the file links and skips the header and its byte order mark', () => {
    expect(
      parseParquetUrlList('﻿ParquetFileUrl\r\nhttps://files.example.test/RO/SPO-1.parquet\r\n\r\n'),
    ).toEqual(['https://files.example.test/RO/SPO-1.parquet']);
  });
});

describe('readMeasurementRows', () => {
  it('reads the EEA parquet columns inside the window', async () => {
    const path = fileURLToPath(new URL('./fixtures/station.parquet', import.meta.url));
    const rows = await readMeasurementRows(
      path,
      new Date('2025-10-01T00:00:00Z'),
      new Date('2026-10-01T00:00:00Z'),
    );
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({
      samplingPoint: 'SPO-RO0072A_00008_100',
      start: new Date('2026-01-01T00:00:00Z'),
      value: 12.5,
      aggType: 'hour',
      validity: 1,
    });
  });
});

function hourRows(day: string, hours: number, value: number): MeasurementRow[] {
  return Array.from({ length: hours }, (_, hour) => ({
    samplingPoint: 'SPO-1',
    start: new Date(`${day}T${String(hour).padStart(2, '0')}:00:00Z`),
    value,
    aggType: 'hour',
    validity: 1,
  }));
}

describe('dailyMeans', () => {
  it('averages valid hours of days with enough hours and keeps daily samples as they are', () => {
    const daily = dailyMeans(
      [
        ...hourRows('2026-01-01', 18, 10),
        ...hourRows('2026-01-02', 17, 10),
        {
          samplingPoint: 'SPO-1',
          start: new Date('2026-01-03T00:00:00Z'),
          value: 25,
          aggType: 'day',
          validity: 1,
        },
        {
          samplingPoint: 'SPO-1',
          start: new Date('2026-01-01T20:00:00Z'),
          value: 500,
          aggType: 'hour',
          validity: -1,
        },
        {
          samplingPoint: 'SPO-1',
          start: new Date('2026-01-01T21:00:00Z'),
          value: -9900,
          aggType: 'hour',
          validity: 1,
        },
      ],
      18,
    );
    expect([...daily]).toEqual([
      ['2026-01-03', 25],
      ['2026-01-01', 10],
    ]);
  });
});

describe('monthlyFromDaily', () => {
  it('averages sampling points per day, then keeps only months with enough days', () => {
    const january = new Map(
      Array.from({ length: 20 }, (_, day) => [`2026-01-${String(day + 1).padStart(2, '0')}`, 10]),
    );
    const secondPoint = new Map([['2026-01-01', 30]]);
    const february = new Map([['2026-02-01', 50]]);
    const result = monthlyFromDaily(
      [january, secondPoint, february],
      ['2026-01-01', '2026-02-01'],
      20,
    );
    expect(result.get('2026-01-01')).toEqual({ mean: 10.5, validDays: 20 });
    expect(result.has('2026-02-01')).toBe(false);
  });
});

describe('pickStationMonths', () => {
  it('prefers verified E1a months over up-to-date E2a months', () => {
    const month = (source: StationMonth['source'], mean: number): StationMonth => ({
      eoiCode: 'RO0072A',
      pollutant: 'no2',
      month: '2026-01-01',
      mean,
      validDays: 30,
      source,
    });
    expect(
      pickStationMonths([month('eea_e2a', 20), month('eea_e1a', 22), month('eea_e2a', 21)]),
    ).toEqual([month('eea_e1a', 22)]);
  });
});
