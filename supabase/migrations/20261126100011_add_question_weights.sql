alter table public.inspection_form_questions
  add column weight smallint not null default 0 check (weight between 0 and 100);

grant update (weight) on public.inspection_form_questions to authenticated;

create function private.split_question_weights(p_form_version_id uuid, p_category_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.inspection_form_questions as question
  set weight = (100 / ordered.total) + case when ordered.rank <= 100 % ordered.total then 1 else 0 end
  from (
    select id,
      row_number() over (partition by category_id order by position, created_at) as rank,
      count(*) over (partition by category_id) as total
    from public.inspection_form_questions
    where form_version_id = p_form_version_id
      and (p_category_id is null or category_id = p_category_id)
  ) as ordered
  where question.id = ordered.id;
$$;

select set_config('app.form_publish_switch', 'on', true);
select private.split_question_weights(id, null) from public.inspection_form_versions;
select set_config('app.form_publish_switch', 'off', true);

create function public.split_inspection_form_question_weights(p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
begin
  perform private.require_admin();
  select form_version_id into version_id
  from public.inspection_form_categories where id = p_category_id;
  if version_id is null then
    raise exception using errcode = 'P0001', message = 'form_item_not_found';
  end if;
  perform private.lock_form_draft(version_id);
  perform private.split_question_weights(version_id, p_category_id);
end;
$$;

create or replace function private.inspection_category_scores(p_inspection_id uuid)
returns table (
  category_id uuid,
  key text,
  weight smallint,
  answered integer,
  total integer,
  score numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    category.id,
    category.key,
    category.weight,
    count(answer.answer)::integer,
    count(question.id)::integer,
    sum(
      question.weight * case answer.answer
        when 'good' then version.points_good
        when 'acceptable' then version.points_acceptable
        when 'problem' then version.points_problem
      end
    ) / nullif(
      sum(question.weight) filter (
        where answer.answer in ('good', 'acceptable', 'problem')
      ),
      0
    )
  from public.inspections
  join public.inspection_form_versions as version on version.id = inspections.form_version_id
  join public.inspection_form_categories as category on category.form_version_id = version.id
  left join public.inspection_form_questions as question on question.category_id = category.id
  left join public.inspection_answers as answer
    on answer.inspection_id = inspections.id and answer.question_id = question.id
  where inspections.id = p_inspection_id
  group by category.id, category.key, category.weight, category.position
  order by category.position;
$$;

create or replace function public.add_inspection_form_question(
  p_category_id uuid,
  p_text_ro text,
  p_text_en text,
  p_required_media public.inspection_required_media
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
  question_id uuid;
begin
  perform private.require_admin();
  select form_version_id into version_id
  from public.inspection_form_categories where id = p_category_id;
  if version_id is null then
    raise exception using errcode = 'P0001', message = 'form_item_not_found';
  end if;
  perform private.lock_form_draft(version_id);

  insert into public.inspection_form_questions (
    category_id, key, position, text_ro, text_en, required_media, weight
  )
  values (
    p_category_id,
    'q-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    coalesce(
      (select max(position) + 1 from public.inspection_form_questions
       where category_id = p_category_id),
      0
    ),
    btrim(coalesce(p_text_ro, '')),
    btrim(coalesce(p_text_en, '')),
    coalesce(p_required_media, 'none'),
    case
      when exists (
        select 1 from public.inspection_form_questions where category_id = p_category_id
      ) then 0
      else 100
    end
  )
  returning id into question_id;

  return question_id;
exception
  when check_violation then
    raise exception using errcode = 'P0001', message = 'form_item_invalid';
end;
$$;

create or replace function public.publish_inspection_form(p_form_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtext('inspection_form_versions'));
  perform private.lock_form_draft(p_form_version_id);

  if not exists (
    select 1 from public.inspection_form_categories where form_version_id = p_form_version_id
  ) then
    raise exception using errcode = 'P0001', message = 'form_category_empty';
  end if;
  if (
    select sum(weight) from public.inspection_form_categories
    where form_version_id = p_form_version_id
  ) <> 100 then
    raise exception using errcode = 'P0001', message = 'form_weights_invalid';
  end if;
  if exists (
    select 1 from public.inspection_form_categories as category
    where category.form_version_id = p_form_version_id
      and not exists (
        select 1 from public.inspection_form_questions
        where inspection_form_questions.category_id = category.id
      )
  ) then
    raise exception using errcode = 'P0001', message = 'form_category_empty';
  end if;
  if exists (
    select 1 from public.inspection_form_questions
    where form_version_id = p_form_version_id
    group by category_id
    having sum(weight) <> 100
  ) then
    raise exception using errcode = 'P0001', message = 'form_question_weights_invalid';
  end if;
  if exists (
    select 1 from public.inspection_form_questions
    where form_version_id = p_form_version_id and btrim(text_ro) = ''
  ) then
    raise exception using errcode = 'P0001', message = 'form_question_empty';
  end if;
  if exists (
    select 1 from public.inspection_form_categories
    where form_version_id = p_form_version_id and btrim(name_en) = ''
  ) or exists (
    select 1 from public.inspection_form_questions
    where form_version_id = p_form_version_id and btrim(text_en) = ''
  ) then
    raise exception using errcode = 'P0001', message = 'form_translation_missing';
  end if;

  update public.inspection_form_versions
  set status = 'archived', archived_at = now()
  where status = 'published';

  update public.inspection_form_versions
  set status = 'published', published_at = now(), published_by = (select auth.uid())
  where id = p_form_version_id;
end;
$$;

create or replace function public.create_inspection_form_draft()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  published public.inspection_form_versions;
  draft_id uuid;
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtext('inspection_form_versions'));

  if exists (select 1 from public.inspection_form_versions where status = 'draft') then
    raise exception using errcode = 'P0001', message = 'form_draft_exists';
  end if;

  select * into published from public.inspection_form_versions where status = 'published';

  insert into public.inspection_form_versions (
    version, points_good, points_acceptable, points_problem, created_by
  )
  values (
    coalesce((select max(version) from public.inspection_form_versions), 0) + 1,
    coalesce(published.points_good, 10),
    coalesce(published.points_acceptable, 6.5),
    coalesce(published.points_problem, 3),
    (select auth.uid())
  )
  returning id into draft_id;

  if published.id is not null then
    perform private.copy_form_items(published.id, draft_id);
  end if;

  return draft_id;
end;
$$;

create or replace function public.restore_inspection_form_version(p_form_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  source public.inspection_form_versions;
  draft_id uuid;
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtext('inspection_form_versions'));

  select * into source from public.inspection_form_versions where id = p_form_version_id;
  if not found or source.status = 'draft' then
    raise exception using errcode = 'P0001', message = 'version_not_found';
  end if;

  perform set_config('app.form_publish_switch', 'on', true);
  delete from public.inspection_form_versions where status = 'draft';
  perform set_config('app.form_publish_switch', 'off', true);

  insert into public.inspection_form_versions (
    version, points_good, points_acceptable, points_problem, created_by
  )
  values (
    coalesce((select max(version) from public.inspection_form_versions), 0) + 1,
    source.points_good,
    source.points_acceptable,
    source.points_problem,
    (select auth.uid())
  )
  returning id into draft_id;

  perform private.copy_form_items(source.id, draft_id);

  return draft_id;
end;
$$;

create function private.copy_form_items(p_source_id uuid, p_target_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  with copied as (
    insert into public.inspection_form_categories (
      form_version_id, key, position, name_ro, name_en, icon, weight
    )
    select p_target_id, key, position, name_ro, name_en, icon, weight
    from public.inspection_form_categories
    where form_version_id = p_source_id
    returning id, key
  )
  insert into public.inspection_form_questions (
    category_id, form_version_id, key, position, text_ro, text_en, required_media, weight
  )
  select copied.id, p_target_id, question.key, question.position, question.text_ro,
    question.text_en, question.required_media, question.weight
  from public.inspection_form_questions as question
  join public.inspection_form_categories as category on category.id = question.category_id
  join copied on copied.key = category.key
  where question.form_version_id = p_source_id;
$$;

revoke execute on function
  private.split_question_weights(uuid, uuid),
  private.copy_form_items(uuid, uuid)
  from public, anon, authenticated;

revoke execute on function public.split_inspection_form_question_weights(uuid) from public, anon;
grant execute on function public.split_inspection_form_question_weights(uuid) to authenticated;
