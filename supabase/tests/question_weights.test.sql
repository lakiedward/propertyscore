begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

create temporary table fixture as
select
  'a0000000-0000-4000-8000-000000000004'::uuid as admin_id,
  'a0000000-0000-4000-8000-000000000003'::uuid as ion_id,
  (select id from public.inspection_form_versions where status = 'published') as published_id,
  (select id from public.inspections order by number limit 1) as inspection_id;

create temporary table ids (name text primary key, id uuid);

grant select on fixture to authenticated;
grant select, insert on ids to authenticated;

select is(
  (select count(*)::int from (
    select category_id from public.inspection_form_questions
    where form_version_id = (select published_id from fixture)
    group by category_id having sum(weight) = 100
  ) as balanced),
  (select count(*)::int from public.inspection_form_categories
   where form_version_id = (select published_id from fixture)),
  'Every category of the published form has question weights totalling 100'
);

select throws_ok(
  $$ update public.inspection_form_questions set weight = 50
     where form_version_id = (select published_id from fixture) $$,
  'P0001', 'form_not_draft',
  'The weights of a published form cannot change'
);

select set_config('app.form_publish_switch', 'on', true);
update public.inspection_form_questions as question
set weight = case question.position when 0 then 70 when 1 then 30 else 0 end
from public.inspection_form_categories as category
where category.id = question.category_id
  and category.key = 'struct'
  and question.form_version_id = (select published_id from fixture);
select set_config('app.form_publish_switch', 'off', true);

update public.inspections
set form_version_id = (select published_id from fixture)
where id = (select inspection_id from fixture);

insert into public.inspection_answers (inspection_id, question_id, answer)
select (select inspection_id from fixture), question.id,
  case question.position when 0 then 'good' else 'problem' end::public.inspection_answer
from public.inspection_form_questions as question
join public.inspection_form_categories as category on category.id = question.category_id
where category.key = 'struct'
  and question.form_version_id = (select published_id from fixture)
  and question.position in (0, 1);

select is(
  (select round(score, 2) from private.inspection_category_scores((select inspection_id from fixture))
   where key = 'struct'),
  7.90,
  'A category score weighs each answer by its question weight'
);

update public.inspection_answers
set answer = 'not_applicable'
where inspection_id = (select inspection_id from fixture)
  and question_id = (
    select question.id from public.inspection_form_questions as question
    join public.inspection_form_categories as category on category.id = question.category_id
    where category.key = 'struct' and question.position = 1
      and question.form_version_id = (select published_id from fixture)
  );

select is(
  (select round(score, 2) from private.inspection_category_scores((select inspection_id from fixture))
   where key = 'struct'),
  10.00,
  'The weight of a question answered N/A is shared out over the answered questions'
);

select is(
  (select score from private.inspection_category_scores((select inspection_id from fixture))
   where key = 'umez'),
  null,
  'A category without answers has no score'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select ion_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('user'))::text,
  true
);

select throws_ok(
  $$ select public.split_inspection_form_question_weights(
       (select id from public.inspection_form_categories limit 1)) $$,
  '42501', 'forbidden',
  'A user cannot split question weights'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select admin_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('admin'))::text,
  true
);

insert into ids values ('draft', public.create_inspection_form_draft());
insert into ids
select 'draft_struct', id from public.inspection_form_categories
where form_version_id = (select id from ids where name = 'draft') and key = 'struct';

select is(
  (select array_agg(weight order by position) from public.inspection_form_questions
   where category_id = (select id from ids where name = 'draft_struct')),
  array[70, 30, 0, 0]::smallint[],
  'A new draft copies the question weights'
);

update public.inspection_form_questions set weight = 40
where category_id = (select id from ids where name = 'draft_struct') and position = 0;

select is(
  (select sum(weight)::int from public.inspection_form_questions
   where category_id = (select id from ids where name = 'draft_struct')),
  70,
  'An admin can change the weight of a draft question'
);

select throws_ok(
  $$ select public.publish_inspection_form((select id from ids where name = 'draft')) $$,
  'P0001', 'form_question_weights_invalid',
  'A form whose question weights do not total 100 in a category cannot be published'
);

select lives_ok(
  $$ select public.split_inspection_form_question_weights((select id from ids where name = 'draft_struct')) $$,
  'An admin can split the question weights of a draft category evenly'
);

select is(
  (select array_agg(weight order by position) from public.inspection_form_questions
   where category_id = (select id from ids where name = 'draft_struct')),
  array[25, 25, 25, 25]::smallint[],
  'Splitting gives every question an equal share'
);

insert into ids values (
  'added',
  public.add_inspection_form_question((select id from ids where name = 'draft_struct'), 'Nouă', 'New', 'none')
);

select is(
  (select weight from public.inspection_form_questions where id = (select id from ids where name = 'added')),
  0::smallint,
  'A question added to a category with questions starts at 0'
);

select lives_ok(
  $$ select public.split_inspection_form_question_weights((select id from ids where name = 'draft_struct')) $$,
  'The split works after adding a question'
);

select is(
  (select array_agg(weight order by position) from public.inspection_form_questions
   where category_id = (select id from ids where name = 'draft_struct')),
  array[20, 20, 20, 20, 20]::smallint[],
  'Five questions get 20 each'
);

select * from finish();
rollback;
