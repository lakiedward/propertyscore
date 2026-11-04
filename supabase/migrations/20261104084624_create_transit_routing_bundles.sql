create table private.transit_routing_bundles (
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  reference_date date not null,
  osm_pbf bytea not null check (octet_length(osm_pbf) > 0),
  gtfs_archives bytea[] not null check (cardinality(gtfs_archives) between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (snapshot_id, city_id)
);

comment on table private.transit_routing_bundles is 'The OSM clip and GTFS archives the accessibility snapshot routed on, per city, so a report can plan the trips from its exact address on the same network.';

create index transit_routing_bundles_city_id_idx on private.transit_routing_bundles (city_id);

alter table private.transit_routing_bundles enable row level security;

revoke all on private.transit_routing_bundles from anon, authenticated;

create trigger transit_routing_bundles_set_updated_at
  before update on private.transit_routing_bundles
  for each row execute function private.set_updated_at();
