import { describe, expect, it } from 'vitest';

import { readEnv } from './env.ts';

describe('readEnv', () => {
  it('needs a Postgres URL and fills the defaults', () => {
    expect(
      readEnv({ DATABASE_URL: 'postgresql://postgres:secret@db.example.test:5432/postgres' }),
    ).toEqual({
      DATABASE_URL: 'postgresql://postgres:secret@db.example.test:5432/postgres',
      SOURCES_DIR: '/tmp/propertyscore-sources',
      OSM_EXTRACT_URL: 'https://download.geofabrik.de/europe/romania-latest.osm.pbf',
      LOG_LEVEL: 'info',
      ADS_API_URL: 'https://ads.atmosphere.copernicus.eu/api',
    });
  });

  it('needs the bucket key when a source mirror is set', () => {
    expect(() =>
      readEnv({
        DATABASE_URL: 'postgresql://postgres:secret@db.example.test:5432/postgres',
        SOURCE_MIRROR_URL:
          'https://example.supabase.co/storage/v1/object/authenticated/source-extracts',
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'invalid_environment',
        message: 'Invalid worker environment: OSM_EXTRACT_API_KEY',
      }),
    );
  });

  it('names the invalid fields without echoing their values', () => {
    expect(() => readEnv({ DATABASE_URL: 'https://secret.example.test' })).toThrow(
      expect.objectContaining({
        code: 'invalid_environment',
        message: 'Invalid worker environment: DATABASE_URL',
      }),
    );
  });
});
