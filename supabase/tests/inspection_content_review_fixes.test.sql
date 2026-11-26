begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create temporary table fixture as
select
  'a0000000-0000-4000-8000-000000000003'::uuid as ion_id,
  'a0000000-0000-4000-8000-000000000004'::uuid as admin_id,
  'a0000000-0000-4000-8000-000000000005'::uuid as mihai_id,
  'd0000000-0000-4000-8000-000000000005'::uuid as today_id,
  'd0000000-0000-4000-8000-000000000001'::uuid as later_id,
  (select id from public.inspection_form_versions where status = 'published') as form_id,
  (select id from public.consent_versions where status = 'published') as consent_id,
  (select array_agg(id order by position) from public.consent_sections
   where consent_version_id = (select id from public.consent_versions where status = 'published')) as sections,
  (select id from public.inspection_form_questions where key = 'struct-1'
   and form_version_id = (select id from public.inspection_form_versions where status = 'published')) as photo_question,
  (select id from public.inspection_form_questions where key = 'umez-3'
   and form_version_id = (select id from public.inspection_form_versions where status = 'published')) as plain_question;

create temporary table ids (name text primary key, id uuid);

grant select on fixture to authenticated, anon;
grant select, insert on ids to authenticated;

insert into storage.objects (bucket_id, name, metadata)
select 'inspection-media', 'd0000000-0000-4000-8000-000000000005/signature/owner.png',
  '{"mimetype": "image/png", "size": 2000}'::jsonb
union all
select 'inspection-media', 'd0000000-0000-4000-8000-000000000005/question/photo-' || n || '.webp',
  '{"mimetype": "image/webp", "size": 1000}'::jsonb
from generate_series(1, 11) as n;

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000005", "role": "authenticated", "user_roles": ["inspector"]}';

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('inspection-media', 'd0000000-0000-4000-8000-000000000001/signature/early.png') $$,
  '42501', null,
  'A signature cannot be uploaded before the day of the visit'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('inspection-media', 'd0000000-0000-4000-8000-000000000005/signature/retry.png') $$,
  'A signature can be uploaded on the day of the visit'
);

set local storage.allow_delete_query = 'true';

delete from storage.objects where name = 'd0000000-0000-4000-8000-000000000005/signature/retry.png';

reset role;

select is(
  (select count(*)::int from storage.objects where name = 'd0000000-0000-4000-8000-000000000005/signature/retry.png'),
  0,
  'The assigned inspector deletes an unregistered file'
);

update public.inspection_form_versions set status = 'archived', archived_at = now()
where id = (select form_id from fixture);

set local role authenticated;

select throws_ok(
  $$ select public.start_inspection((select today_id from fixture), 'Ion Țurcanu', 'ro',
       'd0000000-0000-4000-8000-000000000005/signature/owner.png', (select sections from fixture)) $$,
  'P0001', 'form_not_published',
  'An inspection cannot start without a published form'
);

reset role;

update public.inspection_form_versions set status = 'published', archived_at = null
where id = (select form_id from fixture);

set local role authenticated;

select public.start_inspection((select today_id from fixture), 'Ion Țurcanu', 'ro',
  'd0000000-0000-4000-8000-000000000005/signature/owner.png', (select sections from fixture));

select public.add_inspection_media((select today_id from fixture), (select photo_question from fixture), 'photo',
  'd0000000-0000-4000-8000-000000000005/question/photo-' || n || '.webp', 'image/webp', 1000)
from generate_series(1, 10) as n;

select throws_ok(
  $$ select public.add_inspection_media((select today_id from fixture), (select photo_question from fixture), 'photo',
       'd0000000-0000-4000-8000-000000000005/question/photo-11.webp', 'image/webp', 1000) $$,
  'P0001', 'media_limit_reached',
  'An eleventh photo for one question is refused'
);

select is(
  public.add_inspection_media((select today_id from fixture), (select photo_question from fixture), 'photo',
    'd0000000-0000-4000-8000-000000000005/question/photo-1.webp', 'image/webp', 1000),
  (select id from public.inspection_media where path = 'd0000000-0000-4000-8000-000000000005/question/photo-1.webp'),
  'Registering the same file again returns the existing media'
);

select throws_ok(
  $$ select public.add_inspection_media((select today_id from fixture), (select plain_question from fixture), 'photo',
       'd0000000-0000-4000-8000-000000000005/question/photo-1.webp', 'image/webp', 1000) $$,
  'P0001', 'media_path_taken',
  'A file registered for another question is refused'
);

reset role;

select is(
  private.form_version_inspections((select form_id from fixture)),
  (select count(*)::int from public.inspections where form_version_id = (select form_id from fixture)),
  'A form version counts the inspections that froze it'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000004", "role": "authenticated", "user_roles": ["admin"]}';

select throws_ok(
  $$ select public.add_consent_section((select consent_id from fixture)) $$,
  'P0001', 'consent_not_draft',
  'A published consent cannot get new sections'
);

select throws_ok(
  $$ select public.remove_consent_section(gen_random_uuid()) $$,
  'P0001', 'consent_item_not_found',
  'An unknown consent section cannot be removed'
);

insert into ids values ('consent_draft', public.create_consent_draft());

select is(
  (select count(*)::int from public.consent_sections where consent_version_id = (select id from ids where name = 'consent_draft')),
  (select count(*)::int from public.consent_sections where consent_version_id = (select consent_id from fixture)),
  'A new consent draft copies the published sections'
);

select throws_ok(
  $$ select public.save_consent_sections((select id from ids where name = 'consent_draft'), '{}') $$,
  'P0001', 'consent_item_invalid',
  'Consent sections must be sent as a list'
);

set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000003", "role": "authenticated", "user_roles": ["user"]}';

select throws_ok(
  $$ select public.discard_consent_draft((select id from ids where name = 'consent_draft')) $$,
  '42501', 'forbidden',
  'A user cannot discard a consent draft'
);

set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000004", "role": "authenticated", "user_roles": ["admin"]}';

select lives_ok(
  $$ select public.discard_consent_draft((select id from ids where name = 'consent_draft')) $$,
  'An admin discards a consent draft'
);

select is(
  (select count(*)::int from public.consent_versions where status = 'draft'),
  0,
  'The discarded consent draft is gone'
);

insert into ids values ('empty_draft', public.create_consent_draft());

select public.remove_consent_section(sections.id)
from public.consent_sections as sections
where sections.consent_version_id = (select id from ids where name = 'empty_draft');

select throws_ok(
  $$ select public.publish_consent_version((select id from ids where name = 'empty_draft')) $$,
  'P0001', 'consent_empty',
  'A consent without sections cannot be published'
);

insert into ids values ('restored_consent', public.restore_consent_version((select consent_id from fixture)));

select is(
  (select count(*)::int from public.consent_sections where consent_version_id = (select id from ids where name = 'restored_consent')),
  (select count(*)::int from public.consent_sections where consent_version_id = (select consent_id from fixture)),
  'Restoring a consent version copies its sections into the new draft'
);

insert into ids values ('form_draft', public.create_inspection_form_draft());

select results_eq(
  $$ select points_good, points_acceptable, points_problem,
       (select count(*)::int from public.inspection_form_questions where form_version_id = versions.id)
     from public.inspection_form_versions as versions
     where id = (select id from ids where name = 'form_draft') $$,
  $$ select points_good, points_acceptable, points_problem,
       (select count(*)::int from public.inspection_form_questions where form_version_id = versions.id)
     from public.inspection_form_versions as versions
     where id = (select form_id from fixture) $$,
  'A new form draft copies the published points and questions'
);

select throws_ok(
  $$ select public.add_inspection_form_category((select id from ids where name = 'form_draft'), '', '', null) $$,
  'P0001', 'form_item_invalid',
  'A category needs a name'
);

insert into ids
select 'draft_category', categories.id
from public.inspection_form_categories as categories
where categories.form_version_id = (select id from ids where name = 'form_draft')
order by categories.position
limit 1;

select lives_ok(
  $$ select public.reorder_inspection_form_questions(
       (select id from ids where name = 'draft_category'),
       (select array_agg(id order by position desc) from public.inspection_form_questions
        where category_id = (select id from ids where name = 'draft_category'))
     ) $$,
  'The questions of a category are reordered with the full list'
);

select throws_ok(
  $$ select public.reorder_inspection_form_questions(
       (select id from ids where name = 'draft_category'),
       (select (array_agg(id order by position))[1:1] from public.inspection_form_questions
        where category_id = (select id from ids where name = 'draft_category'))
     ) $$,
  'P0001', 'form_items_changed',
  'A partial list of questions is refused'
);

insert into ids values ('restored_form', public.restore_inspection_form_version((select form_id from fixture)));

select results_eq(
  $$ select points_good, points_acceptable, points_problem,
       (select count(*)::int from public.inspection_form_questions where form_version_id = versions.id)
     from public.inspection_form_versions as versions
     where id = (select id from ids where name = 'restored_form') $$,
  $$ select points_good, points_acceptable, points_problem,
       (select count(*)::int from public.inspection_form_questions where form_version_id = versions.id)
     from public.inspection_form_versions as versions
     where id = (select form_id from fixture) $$,
  'Restoring a form version copies its points and questions into the new draft'
);

select * from finish();
rollback;
