begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

create temporary table fixture as
select
  'a0000000-0000-4000-8000-000000000004'::uuid as admin_id,
  'a0000000-0000-4000-8000-000000000003'::uuid as ion_id,
  (select id from public.consent_versions where status = 'published') as consent_first_id,
  (select id from public.inspection_form_versions where status = 'published') as form_first_id,
  (select id from public.inspections order by number limit 1) as inspection_id;

create temporary table ids (name text primary key, id uuid);

grant select on fixture to authenticated, anon;
grant select, insert, update, delete on ids to authenticated;

set local role anon;

select throws_ok(
  $$ select public.restore_consent_version((select consent_first_id from fixture)) $$,
  '42501', null,
  'Visitors cannot restore a consent version'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select ion_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('user'))::text,
  true
);

select throws_ok(
  $$ select public.restore_consent_version((select consent_first_id from fixture)) $$,
  '42501', 'forbidden',
  'A user cannot restore a consent version'
);

select throws_ok(
  $$ select public.delete_inspection_form_version((select form_first_id from fixture)) $$,
  '42501', 'forbidden',
  'A user cannot delete a form version'
);

select throws_ok(
  $$ select * from public.consent_version_usage() $$,
  '42501', 'forbidden',
  'A user cannot read how consent versions are used'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select admin_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('admin'))::text,
  true
);

insert into ids values ('consent_second', public.create_consent_draft());
select public.publish_consent_version((select id from ids where name = 'consent_second'));

select is(
  (select status::text from public.consent_versions where id = (select consent_first_id from fixture)),
  'archived',
  'Publishing a new consent version archives the first one'
);

select is(
  (select inspection_count from public.consent_version_usage()
   where consent_version_id = (select consent_first_id from fixture)),
  0,
  'An archived consent version no inspection used counts zero inspections'
);

insert into ids values ('consent_restored', public.restore_consent_version((select consent_first_id from fixture)));

select is(
  (select status::text || ' ' || version::text from public.consent_versions
   where id = (select id from ids where name = 'consent_restored')),
  'draft 1.2',
  'Restoring an archived consent version creates the next version as a draft'
);

select is(
  (select count(*)::int from public.consent_sections
   where consent_version_id = (select id from ids where name = 'consent_restored')),
  (select count(*)::int from public.consent_sections
   where consent_version_id = (select consent_first_id from fixture)),
  'The restored draft holds every section of the restored version'
);

select is(
  (select array_agg(title_ro || text_en order by position) from public.consent_sections
   where consent_version_id = (select id from ids where name = 'consent_restored')),
  (select array_agg(title_ro || text_en order by position) from public.consent_sections
   where consent_version_id = (select consent_first_id from fixture)),
  'The restored draft copies the texts in both languages'
);

insert into ids values ('consent_replacing', public.restore_consent_version((select id from ids where name = 'consent_second')));

select is(
  (select count(*)::int from public.consent_versions where status = 'draft'),
  1,
  'Restoring while a draft exists keeps a single draft'
);

select is(
  (select count(*)::int from public.consent_versions where id = (select id from ids where name = 'consent_restored')),
  0,
  'Restoring while a draft exists replaces that draft'
);

select throws_ok(
  $$ select public.restore_consent_version((select id from ids where name = 'consent_replacing')) $$,
  'P0001', 'version_not_found',
  'A draft cannot be restored'
);

select throws_ok(
  $$ select public.delete_consent_version((select id from ids where name = 'consent_second')) $$,
  'P0001', 'version_not_archived',
  'The published consent version cannot be deleted'
);

select throws_ok(
  $$ select public.delete_consent_version((select id from ids where name = 'consent_replacing')) $$,
  'P0001', 'version_not_archived',
  'A consent draft is not deleted through version deletion'
);

reset role;
update public.inspections
set consent_version_id = (select consent_first_id from fixture)
where id = (select inspection_id from fixture);
set local role authenticated;

select is(
  (select inspection_count from public.consent_version_usage()
   where consent_version_id = (select consent_first_id from fixture)),
  1,
  'An archived consent version an inspection used counts that inspection'
);

select throws_ok(
  $$ select public.delete_consent_version((select consent_first_id from fixture)) $$,
  'P0001', 'version_in_use',
  'A consent version an inspection used cannot be deleted'
);

reset role;
update public.inspections set consent_version_id = null where id = (select inspection_id from fixture);
set local role authenticated;

select lives_ok(
  $$ select public.delete_consent_version((select consent_first_id from fixture)) $$,
  'An archived consent version no inspection used can be deleted'
);

select is(
  (select count(*)::int from public.consent_versions where id = (select consent_first_id from fixture))
  + (select count(*)::int from public.consent_sections where consent_version_id = (select consent_first_id from fixture)),
  0,
  'Deleting a consent version removes it with its sections'
);

insert into ids values ('form_second', public.create_inspection_form_draft());
select public.publish_inspection_form((select id from ids where name = 'form_second'));

insert into ids values ('form_restored', public.restore_inspection_form_version((select form_first_id from fixture)));

select is(
  (select status::text || ' ' || version::text from public.inspection_form_versions
   where id = (select id from ids where name = 'form_restored')),
  'draft 3',
  'Restoring an archived form version creates the next version as a draft'
);

select is(
  (select count(*)::int from public.inspection_form_categories
   where form_version_id = (select id from ids where name = 'form_restored')),
  (select count(*)::int from public.inspection_form_categories
   where form_version_id = (select form_first_id from fixture)),
  'The restored form holds every category'
);

select is(
  (select count(*)::int from public.inspection_form_questions
   where form_version_id = (select id from ids where name = 'form_restored')),
  (select count(*)::int from public.inspection_form_questions
   where form_version_id = (select form_first_id from fixture)),
  'The restored form holds every question'
);

select is(
  (select array_agg(category.key || ':' || question.key order by category.position, question.position)
   from public.inspection_form_questions as question
   join public.inspection_form_categories as category on category.id = question.category_id
   where question.form_version_id = (select id from ids where name = 'form_restored')),
  (select array_agg(category.key || ':' || question.key order by category.position, question.position)
   from public.inspection_form_questions as question
   join public.inspection_form_categories as category on category.id = question.category_id
   where question.form_version_id = (select form_first_id from fixture)),
  'Each restored question stays in its category and order'
);

select is(
  (select array[points_good, points_acceptable, points_problem] from public.inspection_form_versions
   where id = (select id from ids where name = 'form_restored')),
  (select array[points_good, points_acceptable, points_problem] from public.inspection_form_versions
   where id = (select form_first_id from fixture)),
  'The restored form keeps the answer points'
);

select throws_ok(
  $$ select public.delete_inspection_form_version((select id from ids where name = 'form_second')) $$,
  'P0001', 'version_not_archived',
  'The published form version cannot be deleted'
);

reset role;
update public.inspections
set form_version_id = (select form_first_id from fixture)
where id = (select inspection_id from fixture);
set local role authenticated;

select is(
  (select inspection_count from public.inspection_form_version_usage()
   where form_version_id = (select form_first_id from fixture)),
  1,
  'An archived form version an inspection used counts that inspection'
);

select throws_ok(
  $$ select public.delete_inspection_form_version((select form_first_id from fixture)) $$,
  'P0001', 'version_in_use',
  'A form version an inspection used cannot be deleted'
);

reset role;
update public.inspections set form_version_id = null where id = (select inspection_id from fixture);
set local role authenticated;

select lives_ok(
  $$ select public.delete_inspection_form_version((select form_first_id from fixture)) $$,
  'An archived form version no inspection used can be deleted'
);

select is(
  (select count(*)::int from public.inspection_form_versions where id = (select form_first_id from fixture))
  + (select count(*)::int from public.inspection_form_questions where form_version_id = (select form_first_id from fixture)),
  0,
  'Deleting a form version removes it with its categories and questions'
);

select throws_ok(
  $$ select public.delete_inspection_form_version(gen_random_uuid()) $$,
  'P0001', 'version_not_found',
  'An unknown form version cannot be deleted'
);

select throws_ok(
  $$ select public.restore_inspection_form_version((select id from ids where name = 'form_restored')) $$,
  'P0001', 'version_not_found',
  'A form draft cannot be restored'
);

select * from finish();
rollback;
