begin;

create extension if not exists pgtap with schema extensions;

select plan(39);

create temporary table fixture as
select
  'a0000000-0000-4000-8000-000000000003'::uuid as ion_id,
  'a0000000-0000-4000-8000-000000000004'::uuid as admin_id,
  'a0000000-0000-4000-8000-000000000005'::uuid as mihai_id,
  'a0000000-0000-4000-8000-000000000006'::uuid as elena_id,
  'd0000000-0000-4000-8000-000000000005'::uuid as today_id,
  'd0000000-0000-4000-8000-000000000001'::uuid as later_id,
  (select array_agg(id order by position) from public.consent_sections
   where consent_version_id = (select id from public.consent_versions where status = 'published')) as sections,
  (select id from public.inspection_form_questions where key = 'struct-1'
   and form_version_id = (select id from public.inspection_form_versions where status = 'published')) as photo_question,
  (select id from public.inspection_form_questions where key = 'umez-3'
   and form_version_id = (select id from public.inspection_form_versions where status = 'published')) as plain_question;

insert into storage.objects (bucket_id, name, metadata)
values
  ('inspection-media', 'd0000000-0000-4000-8000-000000000005/signature/owner.png',
   '{"mimetype": "image/png", "size": 2000}'),
  ('inspection-media', 'd0000000-0000-4000-8000-000000000005/question/photo-1.webp',
   '{"mimetype": "image/webp", "size": 1000}');

grant select on fixture to authenticated, anon;

set local role anon;

select throws_ok(
  $$ select count(*) from public.inspection_answers $$,
  '42501', null,
  'Visitors cannot read inspection answers'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select ion_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('user'))::text,
  true
);

select throws_ok(
  $$ select public.start_inspection((select today_id from fixture), 'Ion Țurcanu', 'ro',
       'd0000000-0000-4000-8000-000000000005/signature/owner.png', (select sections from fixture)) $$,
  '42501', 'forbidden',
  'A user cannot start an inspection'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select elena_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('inspector'))::text,
  true
);

select throws_ok(
  $$ select public.start_inspection((select today_id from fixture), 'Ion Țurcanu', 'ro',
       'd0000000-0000-4000-8000-000000000005/signature/owner.png', (select sections from fixture)) $$,
  'P0001', 'inspection_not_found',
  'An inspector cannot start another inspector''s inspection'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select mihai_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('inspector'))::text,
  true
);

select throws_ok(
  $$ select public.start_inspection((select later_id from fixture), 'Ana Mărginean', 'ro',
       'd0000000-0000-4000-8000-000000000001/signature/owner.png', (select sections from fixture)) $$,
  'P0001', 'inspection_not_startable',
  'An inspection on another day cannot be started'
);

select throws_ok(
  $$ select public.start_inspection((select today_id from fixture), 'Ion Țurcanu', 'ro',
       'd0000000-0000-4000-8000-000000000005/signature/owner.png', (select sections[1:2] from fixture)) $$,
  'P0001', 'consent_incomplete',
  'Every consent section must be accepted'
);

select throws_ok(
  $$ select public.start_inspection((select today_id from fixture), 'Ion Țurcanu', 'ro',
       'd0000000-0000-4000-8000-000000000005/signature/missing.png', (select sections from fixture)) $$,
  'P0001', 'signature_missing',
  'The signature file must exist'
);

select throws_ok(
  $$ select public.save_inspection_answer((select today_id from fixture), (select plain_question from fixture), 'good') $$,
  'P0001', 'inspection_not_in_progress',
  'Answers are refused before the inspection starts'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('inspection-media', 'd0000000-0000-4000-8000-000000000005/signature/second.png') $$,
  'The assigned inspector uploads a signature before the start'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('inspection-media', 'd0000000-0000-4000-8000-000000000005/question/early.webp') $$,
  '42501', null,
  'Question media cannot be uploaded before the start'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('inspection-media', gen_random_uuid()::text || '/signature/other.png') $$,
  '42501', null,
  'An inspector cannot upload into another inspection''s folder'
);

select lives_ok(
  $$ select public.start_inspection((select today_id from fixture), 'Ion Țurcanu', 'ro',
       'd0000000-0000-4000-8000-000000000005/signature/owner.png', (select sections from fixture), 45.75, 21.22) $$,
  'The assigned inspector starts the inspection with the signed consent'
);

select results_eq(
  $$ select status::text, form_version_id is not null, consent_version_id is not null
     from public.inspections where id = (select today_id from fixture) $$,
  $$ values ('in_progress'::text, true, true) $$,
  'Starting freezes the form and consent versions'
);

select is(
  (select jsonb_array_length(sections_snapshot) from public.inspection_consents where inspection_id = (select today_id from fixture)),
  3,
  'The consent keeps a copy of every section the owner accepted'
);

select throws_ok(
  $$ select public.start_inspection((select today_id from fixture), 'Ion Țurcanu', 'ro',
       'd0000000-0000-4000-8000-000000000005/signature/owner.png', (select sections from fixture)) $$,
  'P0001', 'inspection_not_startable',
  'An inspection cannot be started twice'
);

select lives_ok(
  $$ select public.save_inspection_answer((select today_id from fixture), (select plain_question from fixture), 'problem', 'Miros de mucegai în baie.') $$,
  'The inspector saves an answer with a note'
);

select throws_ok(
  $$ select public.save_inspection_answer((select today_id from fixture), gen_random_uuid(), 'good') $$,
  'P0001', 'question_not_in_form',
  'An answer must belong to the inspection''s form'
);

select is(
  ((public.inspection_progress((select today_id from fixture))) ->> 'answered')::int,
  1,
  'Progress counts the answered questions'
);

select throws_ok(
  $$ select public.add_inspection_media((select today_id from fixture), (select photo_question from fixture), 'photo',
       'd0000000-0000-4000-8000-000000000005/question/none.webp', 'image/webp', 1000) $$,
  'P0001', 'media_missing',
  'Media must be uploaded before it is registered'
);

select lives_ok(
  $$ select public.add_inspection_media((select today_id from fixture), (select photo_question from fixture), 'photo',
       'd0000000-0000-4000-8000-000000000005/question/photo-1.webp', 'image/webp', 1000) $$,
  'The inspector registers an uploaded photo'
);

select set_config('storage.allow_delete_query', 'true', true);

delete from storage.objects
where name = 'd0000000-0000-4000-8000-000000000005/question/photo-1.webp';

select is(
  (select count(*)::int from storage.objects
   where name = 'd0000000-0000-4000-8000-000000000005/question/photo-1.webp'),
  1,
  'A registered file cannot be deleted straight from storage'
);

insert into storage.objects (bucket_id, name, metadata)
values ('inspection-media', 'd0000000-0000-4000-8000-000000000005/question/clip.mp4',
  '{"mimetype": "video/mp4", "size": 5000}');

select throws_ok(
  $$ select public.add_inspection_media((select today_id from fixture), (select photo_question from fixture), 'photo',
       'd0000000-0000-4000-8000-000000000005/question/clip.mp4', 'image/webp', 1) $$,
  'P0001', 'media_type_invalid',
  'A video cannot be registered as a photo'
);

select lives_ok(
  $$ select public.add_inspection_media((select today_id from fixture), (select photo_question from fixture), 'video',
       'd0000000-0000-4000-8000-000000000005/question/clip.mp4', 'video/mp4', 1) $$,
  'A video is registered with the type stored in storage'
);

select is(
  public.remove_inspection_media(
    (select id from public.inspection_media where path = 'd0000000-0000-4000-8000-000000000005/question/clip.mp4')
  ),
  'd0000000-0000-4000-8000-000000000005/question/clip.mp4',
  'Removing media returns its path for the storage clean-up'
);

select throws_ok(
  $$ select public.save_inspection_answer((select today_id from fixture), (select plain_question from fixture), 'good', repeat('a', 2001)) $$,
  'P0001', 'note_too_long',
  'A note over 2,000 characters is refused'
);

select is(
  (select count(*)::int from public.inspector_agenda(now() + interval '20 days', now() + interval '21 days')
   where id = (select today_id from fixture)),
  1,
  'The agenda always lists the inspection in progress'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select ion_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('user'))::text,
  true
);

select is(
  (select count(*)::int from public.inspection_consents where inspection_id = (select today_id from fixture)),
  0,
  'The customer cannot read the signed consent'
);

select is(
  (select count(*)::int from public.inspection_media where inspection_id = (select today_id from fixture)),
  0,
  'The customer cannot read the media'
);

select is(
  (select count(*)::int from storage.objects where bucket_id = 'inspection-media'),
  0,
  'The customer sees no inspection file'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select admin_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('admin'))::text,
  true
);

select is(
  (select count(*)::int from public.inspection_consents where inspection_id = (select today_id from fixture)),
  1,
  'An admin reads the signed consent'
);

select ok(
  (select count(*) from storage.objects where bucket_id = 'inspection-media') > 0,
  'An admin reads the inspection files'
);

select throws_ok(
  $$ select public.remove_inspector((select mihai_id from fixture)) $$,
  'P0001', 'inspector_has_open_inspection',
  'An inspector with an inspection in progress cannot be removed'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select mihai_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('inspector'))::text,
  true
);

select throws_ok(
  $$ select public.submit_inspection((select today_id from fixture), 'Ion Țurcanu') $$,
  'P0001', 'inspection_incomplete',
  'An inspection with unanswered questions cannot be submitted'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select elena_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('inspector'))::text,
  true
);

select is(
  (select count(*)::int from public.inspection_answers where inspection_id = (select today_id from fixture)),
  0,
  'Another inspector cannot read the answers'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select mihai_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('inspector'))::text,
  true
);

select public.save_inspection_answer((select today_id from fixture), question.id, 'not_applicable')
from public.inspection_form_questions as question
where question.form_version_id = (select form_version_id from public.inspections where id = (select today_id from fixture))
  and question.id <> (select plain_question from fixture);

select public.save_inspection_answer((select today_id from fixture), (select photo_question from fixture), 'good');

select is(
  ((public.inspection_progress((select today_id from fixture))) ->> 'missing_media')::int,
  0,
  'N/A answers waive the required media'
);

select is(
  ((public.inspection_progress((select today_id from fixture))) ->> 'score')::numeric,
  6.5,
  'The score is the weighted mean of the categories that have answers'
);

select throws_ok(
  $$ select public.submit_inspection((select today_id from fixture), ' ') $$,
  'P0001', 'owner_name_required',
  'The owner must confirm with their name'
);

select lives_ok(
  $$ select public.submit_inspection((select today_id from fixture), 'Ion Țurcanu') $$,
  'A complete inspection is submitted'
);

select results_eq(
  $$ select status::text, score, completion_confirmed_by from public.inspections where id = (select today_id from fixture) $$,
  $$ values ('completed'::text, 6.5::numeric, 'Ion Țurcanu'::text) $$,
  'Submitting freezes the score and the owner''s confirmation'
);

select throws_ok(
  $$ select public.save_inspection_answer((select today_id from fixture), (select plain_question from fixture), 'good') $$,
  'P0001', 'inspection_not_in_progress',
  'A submitted inspection no longer changes'
);

select * from finish();
rollback;
