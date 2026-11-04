begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into storage.objects (bucket_id, name)
values ('source-extracts', 'osm/romania-latest.osm.pbf');

set local storage.allow_delete_query = 'true';

select results_eq(
  $$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'source-extracts' $$,
  $$ values (false, 1073741824::bigint, array['application/octet-stream']) $$,
  'The source extracts bucket is private, 1GiB, octet-stream only'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'source-extracts' $$,
  $$ values (0) $$,
  'A visitor cannot see a source extract'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('source-extracts', 'osm/anon.osm.pbf') $$,
  '42501',
  null,
  'A visitor cannot upload a source extract'
);

select results_eq(
  $$
    with updated as (
      update storage.objects set metadata = '{}'
      where bucket_id = 'source-extracts'
      returning 1
    )
    select count(*)::int from updated
  $$,
  $$ values (0) $$,
  'A visitor cannot change a source extract'
);

select results_eq(
  $$
    with deleted as (
      delete from storage.objects
      where bucket_id = 'source-extracts'
      returning 1
    )
    select count(*)::int from deleted
  $$,
  $$ values (0) $$,
  'A visitor cannot delete a source extract'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';

select results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'source-extracts' $$,
  $$ values (0) $$,
  'A signed-in user cannot see a source extract'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('source-extracts', 'osm/user.osm.pbf') $$,
  '42501',
  null,
  'A signed-in user cannot upload a source extract'
);

select results_eq(
  $$
    with updated as (
      update storage.objects set metadata = '{}'
      where bucket_id = 'source-extracts'
      returning 1
    )
    select count(*)::int from updated
  $$,
  $$ values (0) $$,
  'A signed-in user cannot change a source extract'
);

select results_eq(
  $$
    with deleted as (
      delete from storage.objects
      where bucket_id = 'source-extracts'
      returning 1
    )
    select count(*)::int from deleted
  $$,
  $$ values (0) $$,
  'A signed-in user cannot delete a source extract'
);

reset role;

select results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'source-extracts' $$,
  $$ values (1) $$,
  'No role removed the stored source extract'
);

select * from finish();
rollback;
