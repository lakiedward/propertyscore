begin;

create extension if not exists pgtap with schema extensions;

select plan(39);

create temporary table fixture as
select
  'a0000000-0000-4000-8000-000000000004'::uuid as admin_id,
  'a0000000-0000-4000-8000-000000000003'::uuid as ion_id,
  'a0000000-0000-4000-8000-000000000005'::uuid as mihai_id,
  (select id from public.inspection_form_versions where status = 'published') as published_id,
  (select id from public.consent_versions where status = 'published') as consent_published_id;

create temporary table ids (name text primary key, id uuid);

grant select on fixture to authenticated, anon;
grant select, insert, update on ids to authenticated;

select throws_ok(
  $$ insert into public.inspection_form_categories (form_version_id, key, position, name_ro, weight)
     values ((select published_id from fixture), 'extra', 20, 'Extra', 0) $$,
  'P0001', 'form_not_draft',
  'Nobody can add a category to a published form'
);

set local role anon;

select throws_ok(
  $$ select count(*) from public.inspection_form_versions $$,
  '42501', null,
  'Visitors cannot read inspection forms'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select ion_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('user'))::text,
  true
);

select is(
  (select count(*)::int from public.inspection_form_versions),
  0,
  'A user cannot read inspection forms'
);

select throws_ok(
  $$ select public.create_inspection_form_draft() $$,
  '42501', 'forbidden',
  'A user cannot create a form draft'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select admin_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('admin'))::text,
  true
);

insert into ids values ('draft', public.create_inspection_form_draft());

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select mihai_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('inspector'))::text,
  true
);

select is(
  (select count(*)::int from public.inspection_form_versions where status = 'draft'),
  0,
  'An inspector cannot see a draft form'
);

select is(
  (select count(*)::int from public.inspection_form_categories where form_version_id = (select id from ids where name = 'draft')),
  0,
  'An inspector cannot read the categories of a draft'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select admin_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('admin'))::text,
  true
);

select is(
  (select version from public.inspection_form_versions where id = (select id from ids where name = 'draft')),
  2,
  'The draft gets the next version number'
);

select is(
  (select count(*)::int from public.inspection_form_questions where form_version_id = (select id from ids where name = 'draft')),
  44,
  'The draft copies every question of the published form'
);

select throws_ok(
  $$ select public.create_inspection_form_draft() $$,
  'P0001', 'form_draft_exists',
  'Only one draft can exist'
);

update public.inspection_form_categories
set weight = 20
where form_version_id = (select published_id from fixture) and key = 'struct';

select is(
  (select weight::int from public.inspection_form_categories where form_version_id = (select published_id from fixture) and key = 'struct'),
  15,
  'An admin cannot change a published category'
);

update public.inspection_form_categories
set weight = 20
where form_version_id = (select id from ids where name = 'draft') and key = 'struct';

select is(
  (select weight::int from public.inspection_form_categories where form_version_id = (select id from ids where name = 'draft') and key = 'struct'),
  20,
  'An admin can change a draft category'
);

select throws_ok(
  $$ select public.publish_inspection_form((select id from ids where name = 'draft')) $$,
  'P0001', 'form_weights_invalid',
  'A form whose weights do not total 100 cannot be published'
);

update public.inspection_form_categories
set weight = 10
where form_version_id = (select id from ids where name = 'draft') and key = 'struct';

insert into ids values (
  'category',
  public.add_inspection_form_category((select id from ids where name = 'draft'), 'Exterior', '', 'house')
);

select is(
  (select position::int from public.inspection_form_categories where id = (select id from ids where name = 'category')),
  11,
  'A new category goes to the end'
);

update public.inspection_form_categories set weight = 5 where id = (select id from ids where name = 'category');

select throws_ok(
  $$ select public.publish_inspection_form((select id from ids where name = 'draft')) $$,
  'P0001', 'form_category_empty',
  'A category without questions cannot be published'
);

insert into ids values (
  'question',
  public.add_inspection_form_question((select id from ids where name = 'category'), '', '', 'photo')
);

select throws_ok(
  $$ select public.publish_inspection_form((select id from ids where name = 'draft')) $$,
  'P0001', 'form_question_empty',
  'A question without Romanian text cannot be published'
);

update public.inspection_form_questions set text_ro = 'Fațada are fisuri?' where id = (select id from ids where name = 'question');

select throws_ok(
  $$ select public.publish_inspection_form((select id from ids where name = 'draft')) $$,
  'P0001', 'form_translation_missing',
  'A form with missing English text cannot be published'
);

update public.inspection_form_categories set name_en = 'Exterior' where id = (select id from ids where name = 'category');
update public.inspection_form_questions set text_en = 'Does the facade have cracks?' where id = (select id from ids where name = 'question');

select lives_ok(
  $$ select public.reorder_inspection_form_categories(
       (select id from ids where name = 'draft'),
       array(
         select id from public.inspection_form_categories
         where form_version_id = (select id from ids where name = 'draft')
         order by position desc
       )
     ) $$,
  'An admin can reorder the categories'
);

select is(
  (select key from public.inspection_form_categories where form_version_id = (select id from ids where name = 'draft') and position = 0),
  (select key from public.inspection_form_categories where id = (select id from ids where name = 'category')),
  'The reordered categories keep the new order'
);

select throws_ok(
  $$ select public.reorder_inspection_form_categories((select id from ids where name = 'draft'), array[gen_random_uuid()]) $$,
  'P0001', 'form_items_changed',
  'A reorder that does not list every category is refused'
);

select lives_ok(
  $$ select public.move_inspection_form_question(
       (select id from public.inspection_form_questions where form_version_id = (select id from ids where name = 'draft') and key = 'struct-1'),
       (select id from ids where name = 'category')
     ) $$,
  'An admin can move a question to another category'
);

select is(
  (select count(*)::int from public.inspection_form_questions where category_id = (select id from ids where name = 'category')),
  2,
  'The moved question sits in its new category'
);

select lives_ok(
  $$ select public.remove_inspection_form_question(
       (select id from public.inspection_form_questions where form_version_id = (select id from ids where name = 'draft') and key = 'struct-2')
     ) $$,
  'An admin can remove a question'
);

select is(
  (
    select array_agg(question.position order by question.position)::int[]
    from public.inspection_form_questions as question
    join public.inspection_form_categories as category on category.id = question.category_id
    where category.form_version_id = (select id from ids where name = 'draft') and category.key = 'struct'
  ),
  array[0, 1],
  'Removing a question renumbers the rest'
);

select lives_ok(
  $$ select public.publish_inspection_form((select id from ids where name = 'draft')) $$,
  'An admin can publish a complete draft'
);

select results_eq(
  $$ select version, status::text from public.inspection_form_versions order by version $$,
  $$ values (1, 'archived'::text), (2, 'published'::text) $$,
  'Publishing archives the previous version'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select mihai_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('inspector'))::text,
  true
);

select is(
  (select count(*)::int from public.inspection_form_categories where form_version_id = (select id from ids where name = 'draft')),
  12,
  'An inspector reads the published form'
);

select throws_ok(
  $$ select public.create_inspection_form_draft() $$,
  '42501', 'forbidden',
  'An inspector cannot create a form draft'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select admin_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('admin'))::text,
  true
);

insert into ids values ('consent', public.create_consent_draft());

select throws_ok(
  $$ select public.create_consent_draft() $$,
  'P0001', 'consent_draft_exists',
  'Only one consent draft can exist'
);

select lives_ok(
  $$ select public.save_consent_sections(
       (select id from ids where name = 'consent'),
       (select jsonb_agg(jsonb_build_object(
          'id', id, 'title_ro', 'Date personale', 'title_en', title_en, 'text_ro', text_ro,
          'text_en', text_en, 'check_ro', check_ro, 'check_en', check_en))
        from public.consent_sections
        where consent_version_id = (select id from ids where name = 'consent') and position = 0)
     ) $$,
  'An admin saves the draft sections in one call'
);

select is(
  (select title_ro from public.consent_sections where consent_version_id = (select id from ids where name = 'consent') and position = 0),
  'Date personale',
  'The saved section keeps the new title'
);

select is(
  (select version from public.consent_versions where id = (select id from ids where name = 'consent')),
  1.1,
  'A consent draft gets the next version'
);

insert into ids values ('section', public.add_consent_section((select id from ids where name = 'consent')));

select throws_ok(
  $$ select public.publish_consent_version((select id from ids where name = 'consent')) $$,
  'P0001', 'consent_translation_missing',
  'A consent with an empty section cannot be published'
);

select lives_ok(
  $$ select public.remove_consent_section((select id from ids where name = 'section')) $$,
  'An admin can remove a consent section'
);

update public.consent_sections
set title_en = 'Data processing'
where consent_version_id = (select consent_published_id from fixture) and position = 0;

select is(
  (select title_en from public.consent_sections where consent_version_id = (select consent_published_id from fixture) and position = 0),
  'Personal data processing',
  'An admin cannot change a published consent'
);

select lives_ok(
  $$ select public.publish_consent_version((select id from ids where name = 'consent')) $$,
  'An admin can publish a complete consent draft'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select mihai_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('inspector'))::text,
  true
);

select is(
  (select count(*)::int from public.consent_versions where status = 'draft'),
  0,
  'An inspector never sees a consent draft'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select admin_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('admin'))::text,
  true
);

insert into ids values ('second_draft', public.create_inspection_form_draft());

select lives_ok(
  $$ select public.discard_inspection_form_draft((select id from ids where name = 'second_draft')) $$,
  'An admin discards a draft'
);

select is(
  (select count(*)::int from public.inspection_form_versions where status = 'draft'),
  0,
  'Discarding removes the draft'
);

select throws_ok(
  $$ select public.remove_inspection_form_category(gen_random_uuid()) $$,
  'P0001', 'form_item_not_found',
  'Removing an unknown category is refused'
);

select * from finish();
rollback;
